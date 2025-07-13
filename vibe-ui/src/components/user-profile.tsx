"use client"

import { useState } from 'react'
import { UserButton, useUser } from '@clerk/nextjs'
import { User, Settings, Calendar, Projector } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

export function UserProfile() {
  const { user } = useUser()
  const [activeTab, setActiveTab] = useState('profile')

  if (!user) return null

  const joinDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'Unknown'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.imageUrl} alt={user.fullName || 'User'} />
              <AvatarFallback className="text-lg">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-2xl">
                {user.fullName || 'User'}
              </CardTitle>
              <CardDescription className="text-lg">
                {user.primaryEmailAddress?.emailAddress}
              </CardDescription>
              <div className="flex items-center space-x-4 mt-2">
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>Joined {joinDate}</span>
                </Badge>
                <Badge variant="outline" className="flex items-center space-x-1">
                  <Projector className="h-3 w-3" />
                  <span>Pro User</span>
                </Badge>
              </div>
            </div>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-12 w-12",
                },
              }}
            />
          </div>
        </CardHeader>
      </Card>

      {/* Profile Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'profile'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <User className="h-4 w-4" />
          <span>Profile</span>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'settings'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </button>
      </div>

      {/* Profile Content */}
      {activeTab === 'profile' && (
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Your profile information is managed by Clerk
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-700">First Name</label>
                <div className="mt-1 text-sm text-gray-900">
                  {user.firstName || 'Not set'}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Last Name</label>
                <div className="mt-1 text-sm text-gray-900">
                  {user.lastName || 'Not set'}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <div className="mt-1 text-sm text-gray-900">
                  {user.primaryEmailAddress?.emailAddress}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Username</label>
                <div className="mt-1 text-sm text-gray-900">
                  {user.username || 'Not set'}
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <UserButton
                appearance={{
                  elements: {
                    card: "shadow-lg",
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings Content */}
      {activeTab === 'settings' && (
        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
            <CardDescription>
              Manage your account preferences and security settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">Profile Settings</h3>
                  <p className="text-sm text-gray-600">
                    Update your profile information and avatar
                  </p>
                </div>
                <UserButton
                  appearance={{
                    elements: {
                      card: "shadow-lg",
                    },
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">Security</h3>
                  <p className="text-sm text-gray-600">
                    Manage your password and two-factor authentication
                  </p>
                </div>
                <UserButton
                  appearance={{
                    elements: {
                      card: "shadow-lg",
                    },
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">Connected Accounts</h3>
                  <p className="text-sm text-gray-600">
                    Link your GitHub, Google, and other accounts
                  </p>
                </div>
                <UserButton
                  appearance={{
                    elements: {
                      card: "shadow-lg",
                    },
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 