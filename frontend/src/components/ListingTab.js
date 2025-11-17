import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { FileText, Upload, Zap, Copy } from 'lucide-react';

export default function ListingTab() {
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [listing, setListing] = useState(null);

  const dropzone = useDropzone({
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    multiple: false,
    onDrop: (files) => {
      if (files[0]) {
        const file = files[0];
        setImage(file);
        setPreviewUrl(URL.createObjectURL(file));
        setListing(null);
        toast.success('Image uploaded successfully');
      }
    }
  });

  const generateListing = async () => {
    if (!image) return toast.error('Upload an image first');
    setGenerating(true);
    const formData = new FormData();
    formData.append('image', image);
    try {
      const response = await fetch('/api/listing-from-image', { method: 'POST', body: formData });
      if (response.ok) {
        const data = await response.json();
        setListing(data);
        toast.success('Listing generated successfully!');
      } else {
        throw new Error('Failed to generate listing');
      }
    } catch (error) {
      toast.error('Failed to generate listing');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-8 border border-white/20">
        <h3 className="text-2xl font-semibold text-slate-800 mb-6 flex items-center gap-3">
          <FileText className="w-6 h-6 text-primary-500" />
          AI Listing Generator
        </h3>
        <div {...dropzone.getRootProps()} className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all min-h-[300px] flex flex-col items-center justify-center ${dropzone.isDragActive ? 'border-primary-400 bg-primary-50' : 'border-slate-300 hover:border-primary-400 hover:bg-slate-50'}`}>
          <input {...dropzone.getInputProps()} />
          {previewUrl ? (
            <div className="w-full">
              <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover rounded-lg mb-4" />
              <p className="text-slate-600 font-medium">{image?.name}</p>
              <p className="text-sm text-slate-500">Click to change image</p>
            </div>
          ) : (
            <>
              <Upload className="w-16 h-16 text-slate-400 mb-4" />
              <p className="text-lg text-slate-600 font-medium mb-2">
                {dropzone.isDragActive ? "Drop your artwork here..." : "Upload artwork for listing"}
              </p>
              <p className="text-slate-500">AI will analyze your image and create a complete product listing</p>
            </>
          )}
        </div>
        <motion.button whileHover={{ scale: 1.05 }} onClick={generateListing} disabled={!image || generating} className="w-full mt-6 flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-2xl font-semibold text-lg disabled:opacity-50 hover:shadow-lg transition-all">
          {generating ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyzing Image...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              Generate Listing
            </>
          )}
        </motion.button>
      </motion.div>
      {listing && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-8 border border-white/20">
          <h4 className="text-xl font-semibold text-slate-800 mb-6">Generated Listing</h4>
          <div className="space-y-6">
            <div className="bg-white/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium text-slate-800">Title</h5>
                <button onClick={() => copyToClipboard(listing.title, 'Title')} className="text-primary-500 hover:text-primary-700">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <p className="text-slate-700 font-medium">{listing.title}</p>
            </div>
            <div className="bg-white/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium text-slate-800">Story</h5>
                <button onClick={() => copyToClipboard(listing.story, 'Story')} className="text-primary-500 hover:text-primary-700">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <p className="text-slate-700">{listing.story}</p>
            </div>
            <div className="bg-white/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium text-slate-800">Tags</h5>
                <button onClick={() => copyToClipboard(listing.tags?.join(', ') || '', 'Tags')} className="text-primary-500 hover:text-primary-700">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {listing.tags?.map((tag, index) => (
                  <span key={index} className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="bg-white/50 rounded-xl p-4 text-center">
              <p className="text-sm text-slate-600">Suggested Price</p>
              <p className="font-semibold text-slate-800 text-xl">${listing.suggestedPrice}</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
