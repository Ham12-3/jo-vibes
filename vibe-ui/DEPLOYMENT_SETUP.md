# Deployment Setup Guide

This guide explains how to configure the deployment pipeline to deploy projects to Vercel.

## Prerequisites

1. A Vercel account (free tier works)
2. Vercel API token
3. Optional: Vercel Team ID (for team accounts)

## Step 1: Get Vercel API Token

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your profile picture → Settings
3. Go to "Tokens" section
4. Click "Create Token"
5. Give it a name like "Jo Vibes Deployment"
6. Select appropriate scope (recommended: Full Account access)
7. Copy the generated token

## Step 2: Configure Environment Variables

Add these environment variables to your `.env.local` file:

```bash
# Vercel Deployment Configuration
VERCEL_TOKEN="your-vercel-api-token-here"

# Optional: For team accounts only
VERCEL_TEAM_ID="your-team-id-here"
```

### How to find your Team ID (if using team account):
1. Go to your team dashboard on Vercel
2. Look at the URL: `https://vercel.com/teams/TEAM_ID`
3. The `TEAM_ID` part is your team ID

## Step 3: Restart Your Application

After adding the environment variables:

```bash
npm run dev
```

## Step 4: Test Deployment

1. Create a project in Jo Vibes
2. Go to the project page
3. Click on the "Deploy" tab
4. Click "Deploy Now"
5. Your project should deploy to Vercel!

## Features

### ✅ What Works

- **Automatic Deployment**: One-click deployment to Vercel
- **Custom Domains**: Deploy with custom domain support
- **Status Tracking**: Real-time deployment status monitoring
- **Deployment History**: Track all deployments for each project
- **Live URLs**: Get shareable URLs for deployed projects
- **Project Management**: View all deployments in dashboard
- **Delete Deployments**: Remove deployments from Vercel

### 🎯 Deployment Process

1. **File Preparation**: All project files are packaged for deployment
2. **Configuration**: Automatic Next.js configuration and package.json generation
3. **Upload**: Files are uploaded to Vercel via API
4. **Build**: Vercel builds and deploys your project
5. **Live URL**: Get a live URL to share your project

### 📊 Dashboard Features

- **Deployment Stats**: View total, successful, failed, and pending deployments
- **Search & Filter**: Find deployments by project name or status
- **Quick Actions**: Copy URLs, open deployments, delete old ones
- **Project Links**: Navigate directly to project pages

## Troubleshooting

### "Deployment service is not configured"
- Make sure `VERCEL_TOKEN` is set in `.env.local`
- Restart your application after adding the token
- Check that the token has the correct permissions

### Deployment fails
- Check that your project has valid files
- Ensure the generated package.json has correct dependencies
- Check Vercel dashboard for build logs

### Custom domain issues
- Ensure the domain is properly configured in your DNS
- The domain should point to Vercel's servers
- Custom domains may take time to propagate

## Security Notes

- Keep your Vercel token secure and never commit it to version control
- Use team tokens for team accounts to maintain proper access control
- Regularly rotate your API tokens for security

## API Endpoints

The deployment system includes these tRPC endpoints:

- `deployment.deployProject` - Deploy a project
- `deployment.getProjectDeployments` - Get deployments for a project
- `deployment.getUserDeployments` - Get all user deployments
- `deployment.deleteDeployment` - Delete a deployment
- `deployment.getDeploymentStatus` - Get deployment status
- `deployment.isDeploymentAvailable` - Check if deployment is configured

## Support

If you encounter issues:

1. Check your environment variables
2. Verify your Vercel token permissions
3. Check the browser console for errors
4. Review the deployment logs in Vercel dashboard

---

**Note**: Deployment functionality requires a valid Vercel API token. Without it, the deployment features will be disabled but the rest of the application will work normally. 