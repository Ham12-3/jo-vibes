const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugProjectFiles() {
  try {
    console.log('🔍 Debugging project files...\n');
    
    // Get all projects
    const projects = await prisma.project.findMany({
      include: {
        files: true,
        user: {
          select: {
            username: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`📁 Found ${projects.length} projects:\n`);
    
    for (const project of projects) {
      console.log(`🏗️  Project: ${project.name}`);
      console.log(`   ID: ${project.id}`);
      console.log(`   Status: ${project.status}`);
      console.log(`   Framework: ${project.framework || 'Not set'}`);
      console.log(`   User: ${project.user.username} (${project.user.email})`);
      console.log(`   Files: ${project.files.length}`);
      console.log(`   Created: ${project.createdAt.toISOString()}`);
      
      if (project.files.length > 0) {
        console.log('   📄 File details:');
        for (const file of project.files) {
          const contentLength = file.content.length;
          const preview = file.content.substring(0, 200).replace(/\n/g, '\\n');
          
          // Check for common issues
          const hasReactFragments = file.content.includes('useState') && file.content.includes('useEffect') && !file.content.includes('export default');
          const hasMalformedJSX = file.content.includes('className=') && !file.content.includes('import React');
          const hasUndefined = file.content.includes('undefined');
          const hasNull = file.content.includes('null');
          const isEmpty = file.content.trim().length === 0;
          
          console.log(`     ${file.path} (${contentLength} chars)`);
          console.log(`       Preview: ${preview}...`);
          
          if (hasReactFragments) console.log(`       ⚠️  Contains React fragments without export`);
          if (hasMalformedJSX) console.log(`       ⚠️  Contains JSX without React imports`);
          if (hasUndefined) console.log(`       ⚠️  Contains 'undefined'`);
          if (hasNull) console.log(`       ⚠️  Contains 'null'`);
          if (isEmpty) console.log(`       ⚠️  Empty content`);
          
          // Check for the specific malformed pattern you showed
          if (file.content.includes('clearTimeout(timer)') && file.content.includes('handleError')) {
            console.log(`       🚨 MALFORMED: Contains the problematic pattern you mentioned!`);
          }
        }
      }
      
      console.log(''); // Empty line between projects
    }
    
    // Look specifically for cold water related projects
    const coldWaterProjects = projects.filter(p => 
      p.name.toLowerCase().includes('cold') || 
      p.name.toLowerCase().includes('water') ||
      p.initialPrompt?.toLowerCase().includes('cold') ||
      p.initialPrompt?.toLowerCase().includes('water')
    );
    
    if (coldWaterProjects.length > 0) {
      console.log('🌊 Cold Water Related Projects:');
      for (const project of coldWaterProjects) {
        console.log(`   - ${project.name} (${project.id})`);
        console.log(`     Prompt: ${project.initialPrompt}`);
        console.log(`     Status: ${project.status}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error debugging projects:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug
debugProjectFiles().catch(console.error); 