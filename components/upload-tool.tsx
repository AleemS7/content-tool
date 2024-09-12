'use client'

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Upload, Loader2 } from "lucide-react"

export function UploadTool() {
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loggedInPlatforms, setLoggedInPlatforms] = useState<string[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [trimYouTubeReels, setTrimYouTubeReels] = useState(false)

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && (file.type === 'video/mp4' || file.type === 'video/quicktime')) {
      setVideoFile(file)
    } else {
      alert('Please upload a valid .mp4 or .mov file')
    }
  }

  const handleUploadAndAutomate = async () => {
    if (!videoFile || !title || selectedPlatforms.length === 0) {
      alert('Please upload a video, provide a title, and select at least one platform before uploading.')
      return
    }

    setShowLoginModal(true)
  }

  const handleLogin = (platform: string) => {
    // Simulating a login process
    setTimeout(() => {
      setLoggedInPlatforms(prev => [...prev, platform])
    }, 1000)
  }

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
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
          onClick={handleUploadAndAutomate}
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
                  disabled={loggedInPlatforms.includes(platform.name)}
                  className={`flex items-center justify-center ${platform.color}`}
                >
                  <span className="text-white">
                    {loggedInPlatforms.includes(platform.name) ? 'Logged In' : `Log in to ${platform.name}`}
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