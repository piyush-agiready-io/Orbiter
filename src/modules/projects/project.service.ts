import { nanoid } from 'nanoid';
import { Project } from '@/modules/projects/project.model';
import { NotFoundError, ConflictError } from '@/shared/middleware/api-handler';
import { ForbiddenError } from '@/shared/middleware/role-guard';
import { PAGINATION_DEFAULTS } from '@/shared/utils/constants';
import { escapeRegExp } from '@/shared/utils/escape-regex';
import type { Role } from '@/shared/utils/constants';
import type { CreateProjectInput, UpdateProjectInput } from './project.validator';
// Register User model for .populate('owner' | 'members' | 'clients').
import '@/modules/users/user.model';

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + `-${nanoid(6)}`
  );
}

export const ProjectService = {
  async create(data: CreateProjectInput, userId: string) {
    const slug = slugify(data.name);
    const { User } = await import('@/modules/users/user.model');
    // Only users who have actually joined (lastLoginAt set) get auto-added.
    // Pending invitees stay out until they accept; AuthService.register
    // pulls them into existing projects on accept.
    const teamMembers = await User.find({
      isActive: true,
      role: { $in: ['admin', 'internal'] },
      lastLoginAt: { $ne: null },
    })
      .select('_id')
      .lean();
    const memberIds = teamMembers.map((u) => String(u._id));
    if (!memberIds.includes(userId)) memberIds.push(userId);

    const project = await Project.create({
      ...data,
      slug,
      owner: userId,
      members: memberIds,
    });
    return project;
  },

  async inviteClientToProject(projectId: string, email: string) {
    const { User } = await import('@/modules/users/user.model');
    const { UserService } = await import('@/modules/users/user.service');

    const project = await Project.findById(projectId);
    if (!project) throw new NotFoundError('Project');

    let inviteToken: string | undefined;
    let user = await User.findOne({ email: email.toLowerCase().trim() });

    if (user) {
      if (user.role !== 'client') {
        throw new ConflictError(
          'This email belongs to a team member. Add them via Add Member instead.',
        );
      }
      if (!user.isActive) {
        throw new ConflictError('This client account has been deactivated.');
      }
    } else {
      const result = await UserService.invite({ email, role: 'client' });
      inviteToken = result.inviteToken;
      user = await User.findById(result.user.id);
      if (!user) throw new NotFoundError('User');
    }

    await Project.updateOne(
      { _id: projectId },
      { $addToSet: { clients: user._id } },
    );

    return { user: user.toJSON(), inviteToken };
  },

  async list(
    query: { page?: number; limit?: number; status?: string; search?: string },
    userId: string,
    role: Role,
  ) {
    const page = query.page ?? PAGINATION_DEFAULTS.PAGE;
    const limit = query.limit ?? PAGINATION_DEFAULTS.LIMIT;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.status) {
      filter.status = query.status;
    }
    if (query.search) {
      const regex = new RegExp(escapeRegExp(query.search), 'i');
      filter.$or = [{ name: regex }, { description: regex }];
    }

    // Non-admins only see their own projects
    if (role !== 'admin') {
      if (role === 'client') {
        filter.clients = userId;
      } else {
        filter.members = userId;
      }
    }

    const [projects, total] = await Promise.all([
      Project.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Project.countDocuments(filter),
    ]);

    return { projects, page, limit, total };
  },

  async getById(id: string) {
    const project = await Project.findById(id)
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar')
      .populate('clients', 'name email avatar');
    if (!project) {
      throw new NotFoundError('Project');
    }
    return project;
  },

  async update(id: string, data: UpdateProjectInput) {
    const project = await Project.findByIdAndUpdate(
      id,
      { $set: data },
      { returnDocument: 'after', runValidators: true },
    );
    if (!project) {
      throw new NotFoundError('Project');
    }
    return project;
  },

  async delete(id: string) {
    const project = await Project.findByIdAndDelete(id);
    if (!project) throw new NotFoundError('Project');

    const { Task } = await import('@/modules/tasks/task.model');
    const { Sprint } = await import('@/modules/sprints/sprint.model');
    const { Bug } = await import('@/modules/bugs/bug.model');
    const { Doc } = await import('@/modules/docs/doc.model');
    const { Link } = await import('@/modules/links/link.model');

    await Promise.all([
      Task.deleteMany({ project: id }),
      Sprint.deleteMany({ project: id }),
      Bug.deleteMany({ project: id }),
      Doc.deleteMany({ project: id }),
      Link.deleteMany({ project: id }),
    ]).catch(() => {});

    return project;
  },

  async addMember(projectId: string, userId: string, role: 'member' | 'client') {
    const field = role === 'client' ? 'clients' : 'members';
    const project = await Project.findByIdAndUpdate(
      projectId,
      { $addToSet: { [field]: userId } },
      { returnDocument: 'after' },
    );
    if (!project) {
      throw new NotFoundError('Project');
    }
    return project;
  },

  async removeMember(projectId: string, userId: string) {
    const project = await Project.findByIdAndUpdate(
      projectId,
      { $pull: { members: userId, clients: userId } },
      { returnDocument: 'after' },
    );
    if (!project) {
      throw new NotFoundError('Project');
    }
    return project;
  },

  async backfillTeamMembers() {
    const { User } = await import('@/modules/users/user.model');

    // Joined team members → added to every project.
    const joined = await User.find({
      isActive: true,
      role: { $in: ['admin', 'internal'] },
      lastLoginAt: { $ne: null },
    })
      .select('_id')
      .lean();
    const joinedIds = joined.map((u) => u._id);

    // Pending team members (invited but not yet joined) → removed from any
    // project they were wrongly added to by an earlier sync. They'll be
    // re-added automatically when they accept the invite.
    const pending = await User.find({
      role: { $in: ['admin', 'internal'] },
      $or: [{ lastLoginAt: null }, { lastLoginAt: { $exists: false } }],
    })
      .select('_id')
      .lean();
    const pendingIds = pending.map((u) => u._id);

    let added = { modifiedCount: 0 };
    let removed = { modifiedCount: 0 };

    if (joinedIds.length > 0) {
      added = await Project.updateMany(
        {},
        { $addToSet: { members: { $each: joinedIds } } },
      );
    }
    if (pendingIds.length > 0) {
      removed = await Project.updateMany(
        {},
        { $pullAll: { members: pendingIds } },
      );
    }

    return {
      membersSynced: joinedIds.length,
      pendingRemoved: pendingIds.length,
      projectsUpdated: Math.max(added.modifiedCount ?? 0, removed.modifiedCount ?? 0),
    };
  },

  async checkAccess(projectId: string, userId: string, role: Role): Promise<boolean> {
    if (role === 'admin') return true;

    const project = await Project.findById(projectId);
    if (!project) return false;

    const memberIds = project.members.map((m: { toString(): string }) => m.toString());
    const clientIds = project.clients.map((c: { toString(): string }) => c.toString());

    return memberIds.includes(userId) || clientIds.includes(userId);
  },

  async findByClient(userId: string) {
    const projects = await Project.find({ clients: userId }).sort({ createdAt: -1 });
    return { data: projects, total: projects.length };
  },

  async requireClientAccess(projectId: string, userId: string) {
    const project = await Project.findById(projectId);
    if (!project) throw new NotFoundError('Project');

    const clientIds = project.clients.map((c: { toString(): string }) => c.toString());
    if (!clientIds.includes(userId)) {
      throw new ForbiddenError('You do not have client access to this project');
    }
  },
};
