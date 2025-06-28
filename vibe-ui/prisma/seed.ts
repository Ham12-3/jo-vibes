import { PrismaClient, Prisma } from "../src/generated/prisma";

const prisma = new PrismaClient();

const userData: Prisma.UserCreateInput[] = [
  {
    email: "john@example.com",
    username: "johndoe",
    name: "John Doe",
    bio: "Music lover and vibe creator 🎵",
    avatar: "https://avatar.iran.liara.run/public/1",
    vibes: {
      create: [
        {
          title: "Morning Coffee Bliss",
          description: "That perfect moment when the first sip of coffee hits and the world makes sense again.",
          mood: "CALM",
          color: "#8B4513",
          tags: ["coffee", "morning", "peaceful", "routine"],
          isPublic: true,
        },
        {
          title: "Sunset Beach Walk",
          description: "Golden hour magic with sand between your toes and waves whispering secrets.",
          mood: "ROMANTIC",
          color: "#FF8C00",
          tags: ["sunset", "beach", "golden hour", "nature"],
          isPublic: true,
        },
      ],
    },
  },
  {
    email: "sarah@example.com",
    username: "sarahvibes",
    name: "Sarah Johnson",
    bio: "Spreading positive energy everywhere ✨",
    avatar: "https://avatar.iran.liara.run/public/2",
    vibes: {
      create: [
        {
          title: "Friday Night Energy",
          description: "The week is over, the music is loud, and the night is young!",
          mood: "EXCITED",
          color: "#FF1493",
          tags: ["party", "weekend", "music", "dancing"],
          isPublic: true,
        },
        {
          title: "Sunday Brunch Vibes",
          description: "Lazy Sunday mornings with friends, good food, and endless laughter.",
          mood: "HAPPY",
          color: "#FFD700",
          tags: ["brunch", "friends", "sunday", "laughter"],
          isPublic: true,
        },
      ],
    },
  },
  {
    email: "mike@example.com",
    username: "mikechill",
    name: "Mike Chen",
    bio: "Chill vibes only 🌊",
    avatar: "https://avatar.iran.liara.run/public/3",
    vibes: {
      create: [
        {
          title: "Rainy Day Contemplation",
          description: "Watching raindrops race down the window while deep in thought.",
          mood: "NOSTALGIC",
          color: "#708090",
          tags: ["rain", "reflection", "solitude", "thoughts"],
          isPublic: true,
        },
        {
          title: "Meditation Moment",
          description: "Finding inner peace in the chaos of everyday life.",
          mood: "CALM",
          color: "#20B2AA",
          tags: ["meditation", "peace", "mindfulness", "zen"],
          isPublic: true,
        },
      ],
    },
  },
  {
    email: "emma@example.com",
    username: "emmaenergy",
    name: "Emma Rodriguez",
    bio: "Dance like nobody is watching 💃",
    avatar: "https://avatar.iran.liara.run/public/4",
    vibes: {
      create: [
        {
          title: "Workout Pump",
          description: "When your favorite song comes on and you feel like you can conquer the world.",
          mood: "ENERGETIC",
          color: "#32CD32",
          tags: ["workout", "motivation", "strength", "power"],
          isPublic: true,
        },
        {
          title: "Road Trip Adventure",
          description: "Windows down, music up, and the open road ahead.",
          mood: "UPBEAT",
          color: "#FF4500",
          tags: ["road trip", "adventure", "freedom", "journey"],
          isPublic: true,
        },
      ],
    },
  },
  {
    email: "alex@example.com",
    username: "alexmystic",
    name: "Alex Thompson",
    bio: "Exploring the mysteries of sound 🎭",
    avatar: "https://avatar.iran.liara.run/public/5",
    vibes: {
      create: [
        {
          title: "Late Night Creativity",
          description: "When inspiration strikes at 2 AM and the world is your canvas.",
          mood: "MYSTERIOUS",
          color: "#4B0082",
          tags: ["creativity", "inspiration", "night", "art"],
          isPublic: true,
        },
        {
          title: "Cozy Reading Nook",
          description: "Lost in a good book with a warm blanket and a cup of tea.",
          mood: "CHILL",
          color: "#DEB887",
          tags: ["reading", "cozy", "books", "tea"],
          isPublic: false, // Private vibe
        },
      ],
    },
  },
];

const additionalVibesData: Prisma.VibeCreateInput[] = [
  {
    title: "Midnight Jazz Session",
    description: "Smooth saxophone melodies floating through the night air.",
    mood: "MYSTERIOUS",
    color: "#191970",
    tags: ["jazz", "midnight", "saxophone", "smooth"],
    isPublic: true,
    author: {
      connect: { email: "john@example.com" }
    }
  },
  {
    title: "Spring Garden Vibes",
    description: "Fresh blooms and gentle breezes awakening the soul.",
    mood: "HAPPY",
    color: "#98FB98",
    tags: ["spring", "garden", "flowers", "nature"],
    isPublic: true,
    author: {
      connect: { email: "sarah@example.com" }
    }
  },
];

export async function main() {
  console.log('🌱 Starting database seeding...')

  // Create users with their vibes
  console.log('👥 Creating users with vibes...')
  for (const u of userData) {
    const user = await prisma.user.create({ data: u });
    console.log(`✅ Created user: ${user.username}`);
  }

  // Create additional vibes
  console.log('🎵 Creating additional vibes...')
  for (const vibe of additionalVibesData) {
    const createdVibe = await prisma.vibe.create({ data: vibe });
    console.log(`✅ Created vibe: ${createdVibe.title}`);
  }

  // Get all users and vibes for creating comments and likes
  const users = await prisma.user.findMany();
  const vibes = await prisma.vibe.findMany();

  // Create some comments
  console.log('💬 Creating comments...')
  const commentData: Prisma.CommentCreateInput[] = [
    {
      content: "Absolutely love this! Coffee is life ☕",
      author: { connect: { id: users[1].id } },
      vibe: { connect: { id: vibes[0].id } }
    },
    {
      content: "This perfectly captures my morning routine. So relatable!",
      author: { connect: { id: users[2].id } },
      vibe: { connect: { id: vibes[0].id } }
    },
    {
      content: "YES! This is exactly how I feel right now! 🎉",
      author: { connect: { id: users[3].id } },
      vibe: { connect: { id: vibes[2].id } }
    },
    {
      content: "Weekend vibes are the best vibes!",
      author: { connect: { id: users[4].id } },
      vibe: { connect: { id: vibes[2].id } }
    },
    {
      content: "This sounds like pure magic! 🌅",
      author: { connect: { id: users[1].id } },
      vibe: { connect: { id: vibes[1].id } }
    },
  ];

  for (const comment of commentData) {
    await prisma.comment.create({ data: comment });
  }

  // Create some likes
  console.log('❤️ Creating likes...')
  const likeData: Prisma.LikeCreateInput[] = [
    {
      user: { connect: { id: users[1].id } },
      vibe: { connect: { id: vibes[0].id } }
    },
    {
      user: { connect: { id: users[2].id } },
      vibe: { connect: { id: vibes[0].id } }
    },
    {
      user: { connect: { id: users[3].id } },
      vibe: { connect: { id: vibes[0].id } }
    },
    {
      user: { connect: { id: users[0].id } },
      vibe: { connect: { id: vibes[2].id } }
    },
    {
      user: { connect: { id: users[2].id } },
      vibe: { connect: { id: vibes[2].id } }
    },
    {
      user: { connect: { id: users[4].id } },
      vibe: { connect: { id: vibes[2].id } }
    },
  ];

  for (const like of likeData) {
    await prisma.like.create({ data: like });
  }

  console.log('🎉 Database seeding completed successfully!')
  
  // Print summary
  const userCount = await prisma.user.count();
  const vibeCount = await prisma.vibe.count();
  const commentCount = await prisma.comment.count();
  const likeCount = await prisma.like.count();
  
  console.log('\n📊 Seeding Summary:')
  console.log(`   Users: ${userCount}`)
  console.log(`   Vibes: ${vibeCount}`)
  console.log(`   Comments: ${commentCount}`)
  console.log(`   Likes: ${likeCount}`)
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 