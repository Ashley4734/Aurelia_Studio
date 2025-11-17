import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { Package, FileImage, Zap } from 'lucide-react';

export default function UpscaleTab() {
  const [image, setImage] = useState(null);
  const [packageName, setPackageName] = useState('artwork-package.zip');
  const [processing, setProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const dropzone = useDropzone({
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    multiple: false,
    onDrop: (files) => {
      if (files[0]) {
        const file = files[0];
        setImage(file);
        setPreviewUrl(URL.createObjectURL(file));
        setPackageName(`${file.name.split('.')[0]}-package.zip`);
        toast.success('Image uploaded successfully');
      }
    }
  });

  const createPackage = async () => {
    if (!image) return toast.error('Please upload an image first');
    setProcessing(true);
    const formData = new FormData();
    formData.append('image', image);
    try {
      const response = await fetch('/api/package-artwork', { method: 'POST', body: formData });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = packageName;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Package created and downloaded!');
      } else {
        throw new Error('Failed to create package');
      }
    } catch (error) {
      toast.error('Failed to create package');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-8 border border-white/20">
        <h3 className="text-2xl font-semibold text-slate-800 mb-6 flex items-center gap-3">
          <Package className="w-6 h-6 text-primary-500" />
          Create Print Package
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
              <FileImage className="w-16 h-16 text-slate-400 mb-4" />
              <p className="text-lg text-slate-600 font-medium mb-2">
                {dropzone.isDragActive ? "Drop your artwork here..." : "Upload your artwork"}
              </p>
              <p className="text-slate-500">Drag & drop or click to select an image</p>
              <p className="text-sm text-slate-400 mt-2">Supports JPG, PNG, WebP</p>
            </>
          )}
        </div>
        <div className="mt-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Package Name</label>
          <input type="text" value={packageName} onChange={(e) => setPackageName(e.target.value)} className="w-full px-4 py-3 bg-white/70 border border-white/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Enter package name..." />
        </div>
        <div className="mt-8 flex justify-center">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={createPackage} disabled={!image || processing} className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-2xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all">
            {processing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating Package...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Create Print Package
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
