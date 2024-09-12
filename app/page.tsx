'use client';

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Upload, Loader2 } from "lucide-react"

export default function ContentCreatorUploadTool() {
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loggedInPlatforms, setLoggedInPlatforms] = useState<string[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [trimYouTubeReels, setTrimYouTubeReels] = useState(false)

  useEffect(() => {
    const checkExistingLogins = () => {
      const platforms = ['YouTube', 'Instagram', 'X', 'TikTok'];
      const loggedIn = platforms.filter(platform => 
        localStorage.getItem(`${platform.toLowerCase()}-auth-cookies`)
      );
      setLoggedInPlatforms(loggedIn);
    };

    checkExistingLogins();
  }, []);

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && (file.type === 'video/mp4' || file.type === 'video/quicktime')) {
      setVideoFile(file)
      console.log('File uploaded:', file.name) // Add this line for debugging
    } else {
      alert('Please upload a valid .mp4 or .mov file')
      setVideoFile(null) // Reset the state if an invalid file is selected
    }
  }

  const handleUploadAndAutomate = async () => {
    if (!videoFile || !title || selectedPlatforms.length === 0) {
      alert('Please upload a video, provide a title, and select at least one platform before uploading.');
      return;
    }

    setIsUploading(true);

    for (const platform of selectedPlatforms) {
      const formData = new FormData();
      formData.append('videoFile', videoFile);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('tags', hashtags);
      formData.append('platform', platform);

      try {
        const headers: Record<string, string> = {};
        if (platform === 'YouTube') {
          const tokens = JSON.parse(localStorage.getItem('youtube-auth-tokens') || '{}');
          headers['x-auth-tokens'] = JSON.stringify(tokens);
        } else {
          const cookies = JSON.parse(localStorage.getItem(`${platform.toLowerCase()}-auth-cookies`) || '[]');
          headers['x-auth-cookies'] = JSON.stringify(cookies);
        }

        const response = await fetch('/api/auth/youtube', {
          method: 'POST',
          headers,
          body: formData
        });

        if (response.ok) {
          console.log(`Video uploaded to ${platform} successfully`);
        } else {
          const data = await response.json();
          if (data.needsAuth) {
            console.log(`Authentication needed for ${platform}`);
            await handleLogin(platform);
            // Retry upload after authentication
            const retryResponse = await fetch('/api/auth/youtube', {
              method: 'POST',
              headers: {
                'x-auth-tokens': JSON.stringify(JSON.parse(localStorage.getItem(`${platform.toLowerCase()}-auth-tokens`) || '[]'))
              },
              body: formData
            });
            if (retryResponse.ok) {
              console.log(`Video uploaded to ${platform} successfully after authentication`);
            } else {
              console.error(`Failed to upload video to ${platform} after authentication`);
            }
          } else {
            console.error(`Failed to upload video to ${platform}`);
          }
        }
      } catch (error) {
        console.error(`Error uploading to ${platform}`, error);
      }
    }

    setIsUploading(false);
  }

  const handleLogin = async (platform: string) => {
    try {
      localStorage.removeItem(`${platform.toLowerCase()}-auth-cookies`);
      setLoggedInPlatforms(prev => prev.filter(p => p !== platform));

      if (platform === 'YouTube') {
        const response = await fetch('/api/auth/google');
        const { authUrl } = await response.json();
        
        // Open Google login in a new window
        const authWindow = window.open(authUrl, '_blank', 'width=500,height=600');
        
        // Listen for messages from the auth window
        window.addEventListener('message', async (event) => {
          if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
            const { code } = event.data;
            authWindow?.close();
            
            // Exchange the code for tokens
            const tokenResponse = await fetch('/api/auth/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code })
            });
            
            if (tokenResponse.ok) {
              const { tokens } = await tokenResponse.json();
              localStorage.setItem('youtube-auth-tokens', JSON.stringify(tokens));
              setLoggedInPlatforms(prev => [...prev, platform]);
              alert(`Successfully logged in to ${platform}.`);
            } else {
              alert(`Failed to get tokens for ${platform}. Please try again.`);
            }
          }
        });
      } else {
        // Existing login logic for other platforms
        alert(`A new window will open for ${platform} login. Please log in manually and wait until the process is complete.`);

        const response = await fetch(`/api/auth/youtube?platform=${platform}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log(`${platform} login response:`, data);
        
        if (data.success && data.cookies && data.cookies.length > 0) {
          localStorage.setItem(`${platform.toLowerCase()}-auth-cookies`, JSON.stringify(data.cookies));
          setLoggedInPlatforms(prev => {
            if (!prev.includes(platform)) {
              return [...prev, platform];
            }
            return prev;
          });
          console.log(`${platform} login successful`);
          alert(`Successfully logged in to ${platform}.`);
        } else {
          console.error(`Login to ${platform} failed or no cookies received`);
          alert(`Login to ${platform} failed. Please try again.`);
        }
      }
    } catch (error) {
      console.error(`Error logging in to ${platform}:`, error);
      alert(`Error logging in to ${platform}. Please try again.`);
    }
  }

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => {
      const newSelection = prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform];
      console.log('Selected platforms:', newSelection); // Add this line for debugging
      return newSelection;
    })
  }

  const platforms = [
    { name: 'YouTube', color: 'bg-red-600' },
    { name: 'Instagram', color: 'bg-pink-600' },
    { name: 'X', color: 'bg-blue-400' },
    { name: 'TikTok', color: 'bg-black' }
  ]

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Content Creator Upload Tool</h1>
      
      <div className="space-y-6">
        {/* Video Upload Area */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <Input 
            id="video-upload" 
            type="file" 
            className="hidden" 
            accept=".mp4,.mov" 
            onChange={handleVideoUpload}
          />
          <Label htmlFor="video-upload" className="cursor-pointer">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <span className="mt-2 block text-sm font-semibold text-gray-900">
              {videoFile ? videoFile.name : 'Upload your video (.mp4 or .mov)'}
            </span>
          </Label>
        </div>

        {/* Platform Selection */}
        <div>
          <Label className="mb-2 block">Select Platforms</Label>
          <div className="flex flex-wrap gap-2">
            {platforms.map((platform) => (
              <Button
                key={platform.name}
                onClick={() => togglePlatform(platform.name)}
                className={`${platform.color} ${selectedPlatforms.includes(platform.name) ? 'ring-2 ring-white' : 'opacity-50'}`}
              >
                <span className="text-white">{platform.name}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* YouTube Reels Trimming */}
        {selectedPlatforms.includes('YouTube') && (
          <div className="flex items-center space-x-2">
            <Switch
              id="youtube-trim"
              checked={trimYouTubeReels}
              onCheckedChange={setTrimYouTubeReels}
            />
            <Label htmlFor="youtube-trim">Trim video to under 59 seconds for YouTube Reels</Label>
          </div>
        )}

        {/* Metadata Form */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input 
              id="title" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter video title" 
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter video description" 
            />
          </div>
          <div>
            <Label htmlFor="hashtags">Hashtags (comma-separated)</Label>
            <Input 
              id="hashtags" 
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="Enter hashtags" 
            />
          </div>
        </div>

        {/* Upload & Automate Button */}
        <Button 
          className="w-full"
          onClick={() => {
            setShowLoginModal(true);
            handleUploadAndAutomate();
          }}
          disabled={isUploading || !videoFile || !title || selectedPlatforms.length === 0}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            'Upload & Automate'
          )}
        </Button>
      </div>

      {/* Login Modal */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log in to your accounts</DialogTitle>
            <DialogDescription>
              Please log in to your selected social media accounts to automate the upload process.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {platforms
              .filter(platform => selectedPlatforms.includes(platform.name))
              .map((platform) => (
                <Button
                  key={platform.name}
                  onClick={() => handleLogin(platform.name)}
                  className={`flex items-center justify-center ${platform.color}`}
                >
                  <span className="text-white">
                    {loggedInPlatforms.includes(platform.name) ? 'Re-login to ' : 'Log in to '}{platform.name}
                  </span>
                </Button>
              ))}
          </div>
          <Button 
            onClick={() => setShowLoginModal(false)} 
            className="mt-4 w-full"
            disabled={loggedInPlatforms.length === 0}
          >
            Continue
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}