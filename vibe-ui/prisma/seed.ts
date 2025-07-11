import { PrismaClient, Prisma } from "../src/generated/prisma";

const prisma = new PrismaClient();

const userData: Prisma.UserCreateInput[] = [
  {
    email: "john@example.com",
    username: "johndoe",
    name: "John Doe",
    bio: "Full-stack developer and AI enthusiast 🤖",
    avatar: "https://avatar.iran.liara.run/public/1",
    projects: {
      create: [
        {
          name: "AI Chat Assistant",
          description: "A modern chat interface with AI-powered responses and real-time messaging.",
          status: "READY",
          isPublic: true,
          initialPrompt: "Build a chat application with AI responses similar to ChatGPT",
          screenshots: [],
          framework: "Next.js",
          styling: "Tailwind CSS",
          template: "CHAT_APP",
        },
        {
          name: "E-commerce Dashboard",
          description: "Complete dashboard for managing products, orders, and analytics.",
          status: "DEPLOYED",
          isPublic: true,
          initialPrompt: "Create an admin dashboard for an e-commerce store with analytics",
          screenshots: [],
          framework: "Next.js",
          styling: "Tailwind CSS",
          template: "DASHBOARD",
        },
      ],
    },
  },
  {
    email: "sarah@example.com",
    username: "sarahvibes",
    name: "Sarah Johnson",
    bio: "UI/UX Designer building beautiful web experiences ✨",
    avatar: "https://avatar.iran.liara.run/public/2",
    projects: {
      create: [
        {
          name: "Portfolio Website",
          description: "Clean and modern portfolio website with animations and dark mode.",
          status: "READY",
          isPublic: true,
          initialPrompt: "Design a portfolio website for a UI/UX designer with smooth animations",
          screenshots: [],
          framework: "Next.js",
          styling: "CSS Modules",
          template: "PORTFOLIO",
        },
      ],
    },
  },
  {
    email: "mike@example.com",
    username: "mikedev",
    name: "Mike Chen",
    bio: "Backend engineer exploring AI and automation 🔧",
    avatar: "https://avatar.iran.liara.run/public/3",
    projects: {
      create: [
        {
          name: "Task Management App",
          description: "Collaborative task management with real-time updates and team features.",
          status: "BUILDING",
          isPublic: true,
          initialPrompt: "Build a team task management app like Trello but with better UX",
          screenshots: [],
          framework: "React",
          styling: "Tailwind CSS",
          template: "PRODUCTIVITY",
        },
      ],
    },
  },
  {
    email: "emma@example.com",
    username: "emmacodes",
    name: "Emma Wilson",
    bio: "Frontend developer passionate about user experience 🎨",
    avatar: "https://avatar.iran.liara.run/public/4",
    projects: {
      create: [
        {
          name: "Weather App",
          description: "Beautiful weather application with location-based forecasts and animations.",
          status: "READY",
          isPublic: true,
          initialPrompt: "Create a weather app with beautiful animations and detailed forecasts",
          screenshots: [],
          framework: "React",
          styling: "CSS",
          template: "UTILITY",
        },
      ],
    },
  },
];

async function main() {
  console.log("🌱 Starting database seeding...");

  // Create users with their projects
  console.log("👥 Creating users with projects...");
  for (const u of userData) {
    const user = await prisma.user.create({
      data: u,
      include: { projects: true },
    });
    console.log(`✅ Created user: ${user.username} with ${user.projects.length} projects`);
  }

  // Create some additional projects for existing users
  console.log("📁 Creating additional projects...");
  const users = await prisma.user.findMany();
  
  const additionalProjects = [
    {
      name: "Recipe Finder",
      description: "AI-powered recipe recommendations based on available ingredients.",
      status: "DRAFT" as const,
      isPublic: true,
      initialPrompt: "Build a recipe app that suggests meals based on ingredients I have",
      screenshots: [],
      framework: "React",
      styling: "Tailwind CSS",
      template: "UTILITY",
      userId: users[0]?.id,
    },
    {
      name: "Expense Tracker",
      description: "Simple expense tracking with categories and monthly reports.",
      status: "READY" as const,
      isPublic: true,
      initialPrompt: "Create a personal expense tracker with charts and budget tracking",
      screenshots: [],
      framework: "Next.js",
      styling: "Tailwind CSS",
      template: "UTILITY",
      userId: users[1]?.id,
    },
  ];

  for (const project of additionalProjects) {
    if (project.userId) {
      await prisma.project.create({ data: project });
      console.log(`✅ Created additional project: ${project.name}`);
    }
  }

  // Create some chat sessions and messages
  console.log("💬 Creating chat sessions...");
  for (const user of users.slice(0, 2)) {
    const project = await prisma.project.findFirst({
      where: { userId: user.id },
    });

    if (project) {
      const chatSession = await prisma.chatSession.create({
        data: {
          projectId: project.id,
          userId: user.id,
          title: `Discussion about ${project.name}`,
        },
      });

      // Add some messages
      await prisma.message.create({
        data: {
          content: "I want to add a dark mode toggle to this project. Can you help me implement it?",
          role: "USER",
          chatSessionId: chatSession.id,
          userId: user.id,
        },
      });

      await prisma.message.create({
        data: {
          content: "I'll help you add a dark mode toggle! Let me create a theme context and update your components to support dark mode.",
          role: "ASSISTANT",
          chatSessionId: chatSession.id,
          userId: user.id,
        },
      });

      console.log(`✅ Created chat session for project: ${project.name}`);
    }
  }

  // Create some deployments
  console.log("🚀 Creating deployments...");
  const readyProjects = await prisma.project.findMany({
    where: { status: "READY" },
    include: { user: true },
  });

  for (const project of readyProjects.slice(0, 2)) {
    await prisma.deployment.create({
      data: {
        projectId: project.id,
        userId: project.userId,
        url: `https://${project.name.toLowerCase().replace(/\s+/g, '-')}-${project.id.slice(-6)}.vercel.app`,
        status: "SUCCESS",
        provider: "VERCEL",
        buildLog: "Build completed successfully in 45s",
      },
    });
    console.log(`✅ Created deployment for project: ${project.name}`);
  }

  // Final count
  const projectCount = await prisma.project.count();
  const chatCount = await prisma.chatSession.count();
  const messageCount = await prisma.message.count();
  const deploymentCount = await prisma.deployment.count();

  console.log("\n🎉 Seeding completed!");
  console.log(`📊 Final counts:`);
  console.log(`   - Users: ${users.length}`);
  console.log(`   - Projects: ${projectCount}`);
  console.log(`   - Chat Sessions: ${chatCount}`);
  console.log(`   - Messages: ${messageCount}`);
  console.log(`   - Deployments: ${deploymentCount}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });