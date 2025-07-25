#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

console.log('🚀 Starting Jo-Vibes Development Environment...\n');

// Check if .env.local exists
const envPath = join(process.cwd(), '.env.local');
if (!existsSync(envPath)) {
  console.log('❌ .env.local file not found!');
  console.log('Please create a .env.local file with the required environment variables:');
  console.log('');
  console.log('# Database');
  console.log('DATABASE_URL="postgresql://username:password@localhost:5432/jo-vibes"');
  console.log('');
  console.log('# Authentication (get from clerk.com)');
  console.log('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."');
  console.log('CLERK_SECRET_KEY="sk_test_..."');
  console.log('');
  console.log('# AI Features (get from platform.openai.com)');
  console.log('OPENAI_API_KEY="sk-..."');
  console.log('');
  console.log('# App URL');
  console.log('NEXT_PUBLIC_APP_URL="http://localhost:3001"');
  console.log('');
  console.log('# Custom Sandbox');
  console.log('ENABLE_DOCKER_SANDBOX="true"');
  console.log('');
  console.log('# Development settings');
  console.log('NODE_TLS_REJECT_UNAUTHORIZED="0"');
  process.exit(1);
}

try {
  console.log('📦 Setting up database...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma client generated');
  
  execSync('npx prisma db push', { stdio: 'inherit' });
  console.log('✅ Database schema pushed');
  
  console.log('🌱 Seeding database...');
  execSync('npx prisma db seed', { stdio: 'inherit' });
  console.log('✅ Database seeded');
  
  console.log('🎉 Database setup complete!');
  console.log('🚀 Starting development server...\n');
  
  // Start the development server
  execSync('npm run dev', { stdio: 'inherit' });
  
} catch (error) {
  console.error('❌ Error during setup:', error.message);
  console.log('\n💡 If you see database connection errors, make sure:');
  console.log('   1. Your DATABASE_URL is correct in .env.local');
  console.log('   2. Your database server is running');
  console.log('   3. You have the necessary permissions');
  process.exit(1);
} 