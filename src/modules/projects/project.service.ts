import { nanoid } from 'nanoid';
import { Project } from '@/modules/projects/project.model';
import { NotFoundError } from '@/shared/middleware/api-handler';
import { ForbiddenError } from '@/shared/middleware/role-guard';
import { PAGINATION_DEFAULTS } from '@/shared/utils/constants';
import { escapeRegExp } from '@/shared/utils/escape-regex';
import type { Role } from '@/shared/utils/constants';
import type { CreateProjectInput, UpdateProjectInput } from './project.validator';

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
    const project = await Project.create({
      ...data,
      slug,
      owner: userId,
      members: [userId],
    });
    return project;
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
