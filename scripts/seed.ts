/**
 * Database seed script for Orbiter.
 *
 * Populates MongoDB with realistic data so the UI has content to display.
 * Safe to run multiple times — clears existing data (except admin user) first.
 *
 * Usage:  npm run seed
 */

import mongoose from 'mongoose';
import { hash } from 'bcryptjs';
import { createCipheriv, randomBytes } from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

// ── Load environment ──────────────────────────────────────────────────────────
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not found in .env.local');
  process.exit(1);
}

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
  console.error('ENCRYPTION_KEY not found in .env.local');
  process.exit(1);
}

// ── Encryption helper (mirrors src/shared/lib/encryption.ts) ──────────────────
function encrypt(plaintext: string): { encrypted: string; iv: string; authTag: string } {
  const key = Buffer.from(ENCRYPTION_KEY!, 'hex');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    encrypted: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

// ── Mongoose schemas (inline to avoid @/ path alias issues) ───────────────────

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'internal', 'client'], default: 'internal' },
    skills: { type: [String], default: [] },
    avatar: { type: String },
    isActive: { type: Boolean, default: true },
    inviteToken: { type: String, select: false },
    inviteExpiresAt: { type: Date, select: false },
    resetToken: { type: String, select: false },
    resetExpiresAt: { type: Date, select: false },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

const githubRepoSubSchema = new mongoose.Schema(
  { owner: { type: String, required: true }, repo: { type: String, required: true }, installationId: { type: String } },
  { _id: false },
);

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    clients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    githubRepos: { type: [githubRepoSubSchema], default: [] },
  },
  { timestamps: true },
);

const velocitySubSchema = new mongoose.Schema(
  { planned: { type: Number, default: 0 }, completed: { type: Number, default: 0 } },
  { _id: false },
);

const sprintSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    goal: { type: String, trim: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['planning', 'active', 'closed'], default: 'planning' },
    velocity: { type: velocitySubSchema, default: () => ({ planned: 0, completed: 0 }) },
    retroNotes: { type: String, trim: true },
  },
  { timestamps: true },
);

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    type: { type: String, enum: ['feature', 'chore', 'improvement'], default: 'feature' },
    priority: { type: String, enum: ['P0', 'P1', 'P2', 'P3'], default: 'P2' },
    prioritySource: { type: String, enum: ['ai', 'manual', 'default'], default: 'default' },
    status: { type: String, enum: ['backlog', 'todo', 'in_progress', 'review', 'done'], default: 'backlog' },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    sprint: { type: mongoose.Schema.Types.ObjectId, ref: 'Sprint' },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tags: { type: [String], default: [] },
    clientVisible: { type: Boolean, default: false },
    linkedBugs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bug' }],
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const viewportSubSchema = new mongoose.Schema(
  { width: { type: Number }, height: { type: Number } },
  { _id: false },
);

const bugMetadataSubSchema = new mongoose.Schema(
  {
    url: { type: String },
    consoleLogs: { type: String },
    screenshot: { type: String },
    device: { type: String },
    browser: { type: String },
    os: { type: String },
    viewport: { type: viewportSubSchema },
    ip: { type: String },
  },
  { _id: false },
);

const bugSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    priority: { type: String, enum: ['P0', 'P1', 'P2', 'P3'], default: 'P2' },
    status: { type: String, enum: ['open', 'investigating', 'resolved', 'closed'], default: 'open' },
    source: { type: String, enum: ['manual', 'extension'], default: 'manual' },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    metadata: { type: bugMetadataSubSchema, default: {} },
  },
  { timestamps: true },
);

const linkedEntitySubSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['task', 'sprint'], required: true },
    ref: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  { _id: false },
);

const docSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: mongoose.Schema.Types.Mixed, default: {} },
    contentPlaintext: { type: String, default: '' },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    linkedTo: { type: [linkedEntitySubSchema], default: [] },
  },
  { timestamps: true },
);

const linkSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    type: { type: String, enum: ['production', 'staging', 'figma', 'api_docs', 'repository', 'other'], required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  },
  { timestamps: true },
);

const envVariableSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    value: { type: String, required: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true },
    environment: { type: String, enum: ['dev', 'staging', 'prod'], required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  },
  { timestamps: true },
);

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['bug_created', 'task_assigned', 'comment_mention', 'sprint_closed', 'invite', 'priority_changed', 'client_task_done', 'github_digest'],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    link: { type: String },
    read: { type: Boolean, default: false },
    emailSent: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const commentSchema = new mongoose.Schema(
  {
    content: { type: String, required: true, trim: true, maxlength: 10000 },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    bugId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bug' },
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true },
);

// ── Models ────────────────────────────────────────────────────────────────────
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);
const Sprint = mongoose.models.Sprint || mongoose.model('Sprint', sprintSchema);
const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);
const Bug = mongoose.models.Bug || mongoose.model('Bug', bugSchema);
const Doc = mongoose.models.Doc || mongoose.model('Doc', docSchema);
const Link = mongoose.models.Link || mongoose.model('Link', linkSchema);
const EnvVariable = mongoose.models.EnvVariable || mongoose.model('EnvVariable', envVariableSchema);
const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
const Comment = mongoose.models.Comment || mongoose.model('Comment', commentSchema);

// ── Main seed function ────────────────────────────────────────────────────────
async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI!);
  console.log('Connected.\n');

  const hashedPassword = await hash('OrbiterTest1!', 4);

  // ── 1. Users ──────────────────────────────────────────────────────────────
  console.log('Seeding users...');

  // Preserve admin user — find or create
  let aman = await User.findOne({ email: 'aman@agiready.io' });
  if (!aman) {
    aman = await User.create({
      name: 'Aman',
      email: 'aman@agiready.io',
      password: hashedPassword,
      role: 'admin',
      skills: ['leadership', 'architecture', 'typescript'],
      isActive: true,
    });
    console.log('  Created admin user: aman@agiready.io');
  } else {
    console.log('  Admin user already exists: aman@agiready.io');
  }

  // Clear seeded users (not admin)
  await User.deleteMany({ email: { $in: ['om@agiready.io', 'nitish@agiready.io', 'client@example.com'] } });

  const om = await User.create({
    name: 'Om Rajpal',
    email: 'om@agiready.io',
    password: hashedPassword,
    role: 'internal',
    skills: ['react', 'nextjs', 'typescript'],
    isActive: true,
  });

  const nitish = await User.create({
    name: 'Nitish Srivastava',
    email: 'nitish@agiready.io',
    password: hashedPassword,
    role: 'internal',
    skills: ['nodejs', 'mongodb', 'python'],
    isActive: true,
  });

  const clientUser = await User.create({
    name: 'Client User',
    email: 'client@example.com',
    password: hashedPassword,
    role: 'client',
    skills: [],
    isActive: true,
  });

  console.log('  Created: Om Rajpal, Nitish Srivastava, Client User');

  // ── 2. Clear non-user collections ─────────────────────────────────────────
  console.log('\nClearing existing data (projects, tasks, etc.)...');
  await Promise.all([
    Project.deleteMany({}),
    Sprint.deleteMany({}),
    Task.deleteMany({}),
    Bug.deleteMany({}),
    Doc.deleteMany({}),
    Link.deleteMany({}),
    EnvVariable.deleteMany({}),
    Notification.deleteMany({}),
    Comment.deleteMany({}),
  ]);
  console.log('  Cleared.');

  // ── 3. Projects ───────────────────────────────────────────────────────────
  console.log('\nSeeding projects...');
  const orbiterProject = await Project.create({
    name: 'Orbiter Platform',
    description: 'Internal project management platform for Agiready teams',
    slug: 'orbiter-platform',
    status: 'active',
    owner: aman._id,
    members: [aman._id, om._id, nitish._id],
    clients: [clientUser._id],
  });

  const clientPortal = await Project.create({
    name: 'Client Portal v2',
    description: 'Redesigned client-facing portal with improved UX and real-time updates',
    slug: 'client-portal-v2',
    status: 'active',
    owner: om._id,
    members: [om._id, nitish._id],
    clients: [clientUser._id],
  });

  const apiRedesign = await Project.create({
    name: 'API Redesign',
    description: 'Full REST API redesign with OpenAPI 3.1 spec and versioned endpoints',
    slug: 'api-redesign',
    status: 'active',
    owner: nitish._id,
    members: [aman._id, nitish._id],
    clients: [],
  });

  console.log('  Created: Orbiter Platform, Client Portal v2, API Redesign');

  // ── 4. Sprints ────────────────────────────────────────────────────────────
  console.log('\nSeeding sprints...');
  const sprint1 = await Sprint.create({
    name: 'Sprint 1',
    goal: 'Core authentication and project setup',
    project: orbiterProject._id,
    startDate: new Date('2026-04-14'),
    endDate: new Date('2026-04-18'),
    status: 'closed',
    velocity: { planned: 8, completed: 7 },
    retroNotes: 'Good velocity. One task rolled over due to scope creep on invite flow.',
  });

  const sprint2 = await Sprint.create({
    name: 'Sprint 2',
    goal: 'Task management and security hardening',
    project: orbiterProject._id,
    startDate: new Date('2026-04-21'),
    endDate: new Date('2026-04-25'),
    status: 'active',
    velocity: { planned: 10, completed: 4 },
  });

  const sprint3 = await Sprint.create({
    name: 'Sprint 3',
    goal: 'Polish and documentation',
    project: orbiterProject._id,
    startDate: new Date('2026-04-28'),
    endDate: new Date('2026-05-02'),
    status: 'planning',
    velocity: { planned: 0, completed: 0 },
  });

  console.log('  Created: Sprint 1, Sprint 2, Sprint 3');

  // ── 6. Tasks ──────────────────────────────────────────────────────────────
  console.log('\nSeeding tasks...');

  // Backlog (3)
  const backlogTasks = await Task.insertMany([
    {
      title: 'Implement saved filter views',
      description: 'Allow users to save and load filter presets for the task board',
      type: 'chore',
      priority: 'P3',
      prioritySource: 'manual',
      status: 'backlog',
      project: orbiterProject._id,
      sprint: sprint3._id,
      tags: ['filters', 'ux'],
      clientVisible: false,
      order: 0,
    },
    {
      title: 'Add keyboard shortcuts help overlay',
      description: 'Show a modal with all available keyboard shortcuts when user presses ?',
      type: 'improvement',
      priority: 'P3',
      prioritySource: 'manual',
      status: 'backlog',
      project: orbiterProject._id,
      tags: ['accessibility', 'ux'],
      clientVisible: false,
      order: 1,
    },
    {
      title: 'Write API documentation',
      description: 'Document all REST endpoints with request/response examples using OpenAPI',
      type: 'chore',
      priority: 'P2',
      prioritySource: 'manual',
      status: 'backlog',
      project: orbiterProject._id,
      tags: ['docs'],
      clientVisible: false,
      order: 2,
    },
  ]);

  // Todo (3)
  const todoTasks = await Task.insertMany([
    {
      title: 'Sprint close rollover logic',
      description: 'When a sprint closes, incomplete tasks should roll over to the next sprint automatically',
      type: 'feature',
      priority: 'P1',
      prioritySource: 'manual',
      status: 'todo',
      project: orbiterProject._id,
      sprint: sprint2._id,
      assignee: om._id,
      tags: ['sprint', 'automation'],
      clientVisible: false,
      order: 0,
    },
    {
      title: 'Email notification templates',
      description: 'Create Resend email templates for task assignments, mentions, and sprint summaries',
      type: 'feature',
      priority: 'P1',
      prioritySource: 'manual',
      status: 'todo',
      project: orbiterProject._id,
      sprint: sprint2._id,
      assignee: nitish._id,
      tags: ['email', 'notifications'],
      clientVisible: false,
      order: 1,
    },
    {
      title: 'Rate limiting per endpoint',
      description: 'Add configurable rate limiting middleware with per-route limits',
      type: 'feature',
      priority: 'P2',
      prioritySource: 'manual',
      status: 'todo',
      project: orbiterProject._id,
      sprint: sprint2._id,
      tags: ['security', 'api'],
      clientVisible: false,
      order: 2,
    },
  ]);

  // In Progress (3)
  const jwtTask = await Task.create({
    title: 'JWT refresh token rotation',
    description: 'Implement secure refresh token rotation — each use invalidates the old token and issues a new pair',
    type: 'feature',
    priority: 'P0',
    prioritySource: 'manual',
    status: 'in_progress',
    project: orbiterProject._id,
    sprint: sprint2._id,
    assignee: aman._id,
    tags: ['auth', 'security'],
    clientVisible: true,
    order: 0,
  });

  await Task.insertMany([
    {
      title: 'Kanban drag-and-drop reorder',
      description: 'Enable drag-and-drop task reordering within and across status columns using dnd-kit',
      type: 'feature',
      priority: 'P1',
      prioritySource: 'manual',
      status: 'in_progress',
      project: orbiterProject._id,
      sprint: sprint2._id,
      assignee: om._id,
      tags: ['kanban', 'dnd'],
      clientVisible: false,
      order: 1,
    },
    {
      title: 'Bug detail side panel',
      description: 'Slide-out panel showing full bug details, metadata, and linked tasks',
      type: 'feature',
      priority: 'P2',
      prioritySource: 'manual',
      status: 'in_progress',
      project: orbiterProject._id,
      sprint: sprint2._id,
      assignee: nitish._id,
      tags: ['bugs', 'ui'],
      clientVisible: false,
      order: 2,
    },
  ]);

  // Review (2)
  await Task.insertMany([
    {
      title: 'Project settings member management',
      description: 'UI for adding/removing project members and managing their roles',
      type: 'feature',
      priority: 'P1',
      prioritySource: 'manual',
      status: 'review',
      project: orbiterProject._id,
      sprint: sprint2._id,
      assignee: om._id,
      tags: ['settings', 'members'],
      clientVisible: true,
      order: 0,
    },
    {
      title: 'Environment variable encryption',
      description: 'AES-256-GCM encryption for stored environment variables with per-project keys',
      type: 'feature',
      priority: 'P1',
      prioritySource: 'manual',
      status: 'review',
      project: orbiterProject._id,
      sprint: sprint2._id,
      assignee: aman._id,
      tags: ['security', 'env'],
      clientVisible: false,
      order: 1,
    },
  ]);

  // Done (4)
  await Task.insertMany([
    {
      title: 'Login + JWT auth implementation',
      description: 'Complete login flow with access/refresh token pair and secure HTTP-only cookies',
      type: 'feature',
      priority: 'P0',
      prioritySource: 'manual',
      status: 'done',
      project: orbiterProject._id,
      sprint: sprint1._id,
      assignee: aman._id,
      tags: ['auth'],
      clientVisible: true,
      order: 0,
    },
    {
      title: 'User invite flow with email',
      description: 'Invite users by email with expiring tokens and automatic account creation',
      type: 'feature',
      priority: 'P1',
      prioritySource: 'manual',
      status: 'done',
      project: orbiterProject._id,
      sprint: sprint1._id,
      assignee: nitish._id,
      tags: ['auth', 'email'],
      clientVisible: false,
      order: 1,
    },
    {
      title: 'Project CRUD API',
      description: 'REST endpoints for creating, reading, updating, and archiving projects',
      type: 'feature',
      priority: 'P1',
      prioritySource: 'manual',
      status: 'done',
      project: orbiterProject._id,
      sprint: sprint1._id,
      assignee: om._id,
      tags: ['api', 'projects'],
      clientVisible: false,
      order: 2,
    },
    {
      title: 'Database schema design',
      description: 'Design and implement all Mongoose schemas with indexes and validation',
      type: 'feature',
      priority: 'P0',
      prioritySource: 'manual',
      status: 'done',
      project: orbiterProject._id,
      sprint: sprint1._id,
      assignee: aman._id,
      tags: ['database', 'architecture'],
      clientVisible: false,
      order: 3,
    },
  ]);

  console.log('  Created 15 tasks across all statuses');

  // ── 7. Bugs ───────────────────────────────────────────────────────────────
  console.log('\nSeeding bugs...');
  await Bug.insertMany([
    {
      title: 'Login button unresponsive on mobile',
      description: 'The login button does not respond to taps on iOS Safari and Chrome mobile. Desktop works fine.',
      priority: 'P1',
      status: 'open',
      source: 'manual',
      project: orbiterProject._id,
      reporter: om._id,
      metadata: {},
    },
    {
      title: 'Console error on empty project list',
      description: 'TypeError thrown when user has no projects — the project list component tries to map over undefined.',
      priority: 'P2',
      status: 'investigating',
      source: 'extension',
      project: orbiterProject._id,
      reporter: nitish._id,
      metadata: {
        url: 'https://orbiter.io/projects',
        consoleLogs: 'TypeError: Cannot read properties of undefined',
        browser: 'Chrome 124',
        os: 'macOS',
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      title: 'Incorrect sprint velocity calculation',
      description: 'Completed count includes rolled-over tasks from previous sprint, inflating the velocity metric.',
      priority: 'P1',
      status: 'open',
      source: 'manual',
      project: orbiterProject._id,
      reporter: aman._id,
      metadata: {},
    },
    {
      title: 'Dark mode toggle flickers',
      description: 'When toggling dark mode, the page briefly flashes white before applying the dark theme.',
      priority: 'P3',
      status: 'resolved',
      source: 'manual',
      project: orbiterProject._id,
      reporter: om._id,
      metadata: {},
    },
  ]);
  console.log('  Created 4 bugs');

  // ── 8. Docs ───────────────────────────────────────────────────────────────
  console.log('\nSeeding docs...');
  await Doc.insertMany([
    {
      title: 'Getting Started Guide',
      content: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Getting Started with Orbiter' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Welcome to Orbiter, the internal project management platform built by Agiready. This guide will walk you through setting up your account, creating your first project, and managing tasks with your team.',
              },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Quick Start' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'After logging in, navigate to the Projects page to create a new project. Add team members, set up sprints, and start creating tasks. Use the Kanban board to track progress visually.',
              },
            ],
          },
        ],
      },
      contentPlaintext:
        'Getting Started with Orbiter\nWelcome to Orbiter, the internal project management platform built by Agiready. This guide will walk you through setting up your account, creating your first project, and managing tasks with your team.\nQuick Start\nAfter logging in, navigate to the Projects page to create a new project. Add team members, set up sprints, and start creating tasks. Use the Kanban board to track progress visually.',
      project: orbiterProject._id,
      author: aman._id,
      linkedTo: [],
    },
    {
      title: 'API Authentication Guide',
      content: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'API Authentication' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Orbiter uses JWT-based authentication with access and refresh token pairs. Access tokens expire after 15 minutes, while refresh tokens last 7 days. Token rotation is enforced — each refresh invalidates the previous token.',
              },
            ],
          },
        ],
      },
      contentPlaintext:
        'API Authentication\nOrbiter uses JWT-based authentication with access and refresh token pairs. Access tokens expire after 15 minutes, while refresh tokens last 7 days. Token rotation is enforced — each refresh invalidates the previous token.',
      project: orbiterProject._id,
      author: nitish._id,
      linkedTo: [],
    },
  ]);
  console.log('  Created 2 docs');

  // ── 9. Links ──────────────────────────────────────────────────────────────
  console.log('\nSeeding links...');
  await Link.insertMany([
    { label: 'Production', url: 'https://orbiter.io', type: 'production', project: orbiterProject._id },
    { label: 'Staging', url: 'https://staging.orbiter.io', type: 'staging', project: orbiterProject._id },
    { label: 'Figma Designs', url: 'https://figma.com/file/orbiter', type: 'figma', project: orbiterProject._id },
    { label: 'API Docs', url: 'https://docs.orbiter.io', type: 'api_docs', project: orbiterProject._id },
  ]);
  console.log('  Created 4 links');

  // ── 10. Notifications ─────────────────────────────────────────────────────
  console.log('\nSeeding notifications...');
  await Notification.insertMany([
    {
      user: aman._id,
      type: 'bug_created',
      title: 'New bug reported',
      message: 'Login button unresponsive on mobile',
      link: `/projects/${orbiterProject._id}/bugs`,
      read: false,
      emailSent: false,
    },
    {
      user: aman._id,
      type: 'sprint_closed',
      title: 'Sprint 1 closed',
      message: '7/8 tasks completed',
      link: `/projects/${orbiterProject._id}/sprints`,
      read: true,
      emailSent: true,
    },
    {
      user: aman._id,
      type: 'task_assigned',
      title: 'Task assigned',
      message: 'Om assigned to Sprint close rollover logic',
      link: `/projects/${orbiterProject._id}/tasks`,
      read: false,
      emailSent: false,
    },
    {
      user: aman._id,
      type: 'priority_changed',
      title: 'Priority changed',
      message: 'P0 bug detected: JWT refresh token rotation',
      link: `/projects/${orbiterProject._id}/tasks`,
      read: false,
      emailSent: false,
    },
    {
      user: aman._id,
      type: 'client_task_done',
      title: 'Task completed',
      message: 'Client Portal v2 — Project settings member management completed',
      link: `/projects/${clientPortal._id}/tasks`,
      read: true,
      emailSent: true,
    },
  ]);
  console.log('  Created 5 notifications');

  // ── 11. Env Variables ─────────────────────────────────────────────────────
  console.log('\nSeeding env variables...');
  const envVars = [
    { key: 'DATABASE_URL', value: 'mongodb://localhost:27017/orbiter', environment: 'dev' as const },
    { key: 'API_SECRET', value: 'sk-prod-xxxxxxxxxxxxx', environment: 'prod' as const },
    { key: 'REDIS_URL', value: 'redis://localhost:6379', environment: 'dev' as const },
  ];

  const envDocs = envVars.map((ev) => {
    const { encrypted, iv, authTag } = encrypt(ev.value);
    return {
      key: ev.key,
      value: encrypted,
      iv,
      authTag,
      environment: ev.environment,
      project: orbiterProject._id,
    };
  });

  await EnvVariable.insertMany(envDocs);
  console.log('  Created 3 encrypted env variables');

  // ── 12. Comments ──────────────────────────────────────────────────────────
  console.log('\nSeeding comments...');
  await Comment.insertMany([
    {
      content: "Found the root cause — refresh token wasn't being rotated on each use",
      author: aman._id,
      taskId: jwtTask._id,
      mentions: [],
    },
    {
      content: 'Should we also invalidate old refresh tokens?',
      author: om._id,
      taskId: jwtTask._id,
      mentions: [],
    },
    {
      content: 'Yes, implementing token family rotation as discussed',
      author: aman._id,
      taskId: jwtTask._id,
      mentions: [],
    },
  ]);
  console.log('  Created 3 comments');

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n────────────────────────────────────────');
  console.log('Seed completed successfully!');
  console.log('────────────────────────────────────────');
  console.log(`  Users:          4 (1 admin + 3 seeded)`);
  console.log(`  Projects:       3`);
  console.log(`  Sprints:        3`);
  console.log(`  Tasks:         15`);
  console.log(`  Bugs:           4`);
  console.log(`  Docs:           2`);
  console.log(`  Links:          4`);
  console.log(`  Env Variables:  3`);
  console.log(`  Notifications:  5`);
  console.log(`  Comments:       3`);
  console.log('────────────────────────────────────────\n');
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => {
    mongoose.disconnect();
  });
