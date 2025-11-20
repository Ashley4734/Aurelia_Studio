import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { Upload, Package, Zap, Download, Eye, FileImage, Trash2, Grid, Search, Calendar, HardDrive, Image as ImageIcon } from 'lucide-react';

export default function MockupsTab() {
  const [mockups, setMockups] = useState([]);
  const [savedMockups, setSavedMockups] = useState([]);
  const [artworks, setArtworks] = useState([]);
  const [results, setResults] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentProcessing, setCurrentProcessing] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadSavedMockups();
  }, []);

  const loadSavedMockups = async () => {
    try {
      const response = await fetch('/api/mockups');
      if (response.ok) {
        const data = await response.json();
        setSavedMockups(data);
      }
    } catch (error) {
      console.error('Failed to load mockups:', error);
    }
  };

  const mockupDropzone = useDropzone({
    accept: { 'application/octet-stream': ['.psd'], 'image/*': ['.jpg', '.jpeg', '.png'] },
    onDrop: (files) => {
      setMockups([...mockups, ...files]);
      toast.success(`Added ${files.length} mockup file(s)`);
    }
  });

  const artworkDropzone = useDropzone({
    accept: { 'image/*': ['.jpg', '.jpeg', '.png'] },
    multiple: true,
    onDrop: (files) => {
      setArtworks([...artworks, ...files]);
      toast.success(`Added ${files.length} artwork file(s)`);
    }
  });

  const saveMockupsToLibrary = async () => {
    if (mockups.length === 0) {
      toast.error('No mockups to save');
      return;
    }

    const formData = new FormData();
    mockups.forEach(file => formData.append('mockups', file));

    try {
      const response = await fetch('/api/save-mockups', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        toast.success('Mockups saved to library');
        await loadSavedMockups();
        setMockups([]);
      } else {
        throw new Error('Save failed');
      }
    } catch (error) {
      toast.error('Failed to save mockups');
    }
  };

  const loadFromLibrary = async (mockupIds) => {
    try {
      const loadedFiles = [];
      const existingFileNames = new Set(mockups.map(m => m.name));

      for (const id of mockupIds) {
        const fileName = `${id}.psd`;

        // Skip if already loaded
        if (existingFileNames.has(fileName)) {
          toast.info(`"${fileName}" is already loaded`);
          continue;
        }

        const response = await fetch(`/api/mockup/${id}`);
        if (response.ok) {
          const blob = await response.blob();
          const file = new File([blob], fileName, { type: 'application/octet-stream' });
          loadedFiles.push(file);
        }
      }

      if (loadedFiles.length > 0) {
        setMockups([...mockups, ...loadedFiles]);
        toast.success(`Loaded ${loadedFiles.length} mockup(s) from library`);
      }
    } catch (error) {
      toast.error('Failed to load from library');
    }
  };

  const deleteMockup = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/mockup/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Mockup deleted successfully');
        await loadSavedMockups();
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      toast.error('Failed to delete mockup');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (date) => {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredMockups = savedMockups.filter(mockup =>
    mockup.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const processAllMockups = async () => {
    if (artworks.length === 0 || mockups.length === 0) {
      toast.error('Please upload both artwork and mockup files first');
      return;
    }

    setProcessing(true);
    setResults([]);
    setProgress(0);

    try {
      const processedResults = [];
      const totalCombinations = mockups.length * artworks.length;
      let currentIndex = 0;

      // Process each mockup with each artwork
      for (let mockupIndex = 0; mockupIndex < mockups.length; mockupIndex++) {
        const mockup = mockups[mockupIndex];
        const mockupBase64 = await fileToBase64(mockup);

        for (let artworkIndex = 0; artworkIndex < artworks.length; artworkIndex++) {
          const artwork = artworks[artworkIndex];
          currentIndex++;

          setProgress((currentIndex / totalCombinations) * 100);
          setCurrentProcessing(`${mockup.name} × ${artwork.name}`);

          try {
            const artworkBase64 = await fileToBase64(artwork);

            const response = await fetch('/api/process-psd', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                psd_file: mockupBase64,
                artwork_file: artworkBase64,
                filename: mockup.name
              })
            });

            if (response.ok) {
              const blob = await response.blob();
              const processedFile = {
                name: `${mockup.name.replace(/\.(psd|jpg|jpeg|png)$/i, '')}_${artwork.name.replace(/\.(jpg|jpeg|png)$/i, '')}.jpg`,
                url: URL.createObjectURL(blob),
                blob,
                mockupName: mockup.name,
                artworkName: artwork.name,
                combination: `${mockupIndex + 1}-${artworkIndex + 1}`
              };
              processedResults.push(processedFile);
            } else {
              toast.error(`Failed to process ${mockup.name} × ${artwork.name}`);
            }
          } catch (error) {
            console.error(`Error processing ${mockup.name} × ${artwork.name}:`, error);
            toast.error(`Error processing ${mockup.name} × ${artwork.name}`);
          }
        }
      }

      setResults(processedResults);
      toast.success(`Successfully processed ${processedResults.length} combinations (${mockups.length} mockups × ${artworks.length} artworks)`);
    } catch (error) {
      toast.error('Processing failed');
      console.error('Processing error:', error);
    } finally {
      setProcessing(false);
      setProgress(0);
      setCurrentProcessing('');
    }
  };

  const downloadAllAsZip = async () => {
    if (results.length === 0) return;

    const formData = new FormData();
    results.forEach(result => {
      formData.append('images', result.blob, result.name);
    });

    try {
      const response = await fetch('/api/create-zip', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'processed-mockups.zip';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('ZIP file downloaded successfully');
      }
    } catch (error) {
      toast.error('Failed to create ZIP file');
    }
  };

  const removeArtwork = (indexToRemove) => {
    setArtworks(artworks.filter((_, index) => index !== indexToRemove));
    toast.success('Artwork removed');
  };

  const clearAllArtworks = () => {
    setArtworks([]);
    toast.success('All artworks cleared');
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
    });
  };

  return (
    <div className="space-y-8">
      {/* Upload Sections */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Mockup Upload */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-6 border border-white/20">
          <h3 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <FileImage className="w-5 h-5 text-primary-500" />
            Upload Mockups
          </h3>

          <div {...mockupDropzone.getRootProps()} className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${mockupDropzone.isDragActive ? 'border-primary-400 bg-primary-50' : 'border-slate-300 hover:border-primary-400'}`}>
            <input {...mockupDropzone.getInputProps()} />
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">
              {mockupDropzone.isDragActive ? "Drop mockups here..." : "Drag & drop PSD/image files here"}
            </p>
            <p className="text-sm text-slate-500 mt-2">Supports .psd, .jpg, .png files</p>
          </div>

          {mockups.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">{mockups.length} file(s) selected</span>
                <button onClick={saveMockupsToLibrary} className="text-xs bg-primary-100 text-primary-700 px-3 py-1 rounded-full hover:bg-primary-200 transition-colors">
                  Save to Library
                </button>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {mockups.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-white/50 rounded-lg p-2">
                    <span className="text-sm text-slate-600 truncate">{file.name}</span>
                    <button onClick={() => setMockups(mockups.filter((_, i) => i !== index))} className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Artwork Upload - Now supports multiple */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-3xl p-6 border border-white/20">
          <h3 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-accent-500" />
            Upload Artwork
            <span className="text-xs bg-accent-100 text-accent-700 px-2 py-1 rounded-full">Multiple</span>
          </h3>

          <div {...artworkDropzone.getRootProps()} className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${artworkDropzone.isDragActive ? 'border-accent-400 bg-accent-50' : 'border-slate-300 hover:border-accent-400'}`}>
            <input {...artworkDropzone.getInputProps()} />
            <Package className="w-8 h-8 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">
              {artworkDropzone.isDragActive ? "Drop artworks here..." : "Drag & drop multiple artwork files here"}
            </p>
            <p className="text-sm text-slate-500 mt-2">Multiple image files (.jpg, .png)</p>
          </div>

          {artworks.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">{artworks.length} artwork(s) uploaded</span>
                <button onClick={clearAllArtworks} className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full hover:bg-red-200 transition-colors">
                  Clear All
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {artworks.map((file, index) => (
                  <div key={index} className="bg-white/50 rounded-lg p-2 relative group">
                    <div className="flex items-center gap-2">
                      <FileImage className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <span className="text-xs text-slate-600 truncate">{file.name}</span>
                    </div>
                    <button
                      onClick={() => removeArtwork(index)}
                      className="absolute top-1 right-1 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Library Section */}
      {savedMockups.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-3xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <Package className="w-5 h-5 text-green-500" />
              Mockup Library
              <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded-full">{savedMockups.length}</span>
            </h3>
          </div>

          {/* Search Bar */}
          {savedMockups.length > 3 && (
            <div className="mb-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search mockups..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/70 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all"
                />
              </div>
            </div>
          )}

          {filteredMockups.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No mockups found matching "{searchQuery}"</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredMockups.map((mockup) => (
                <motion.div
                  key={mockup.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white/70 rounded-xl overflow-hidden border border-white/50 hover:shadow-lg transition-all group"
                >
                  {/* Thumbnail */}
                  <div
                    className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 relative cursor-pointer"
                    onClick={() => loadFromLibrary([mockup.id])}
                  >
                    {mockup.hasThumbnail ? (
                      <img
                        src={`/api/mockup/${mockup.id}/thumbnail`}
                        alt={mockup.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileImage className="w-12 h-12 text-slate-400" />
                      </div>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                      <span className="text-white text-xs font-medium">Click to load</span>
                    </div>
                  </div>

                  {/* Info Section */}
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-sm font-medium text-slate-700 truncate flex-1" title={mockup.name}>
                        {mockup.name}
                      </h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMockup(mockup.id, mockup.name);
                        }}
                        className="text-red-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete mockup"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Metadata */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <HardDrive className="w-3 h-3" />
                        <span>{formatFileSize(mockup.size)}</span>
                      </div>

                      {mockup.dimensions && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <ImageIcon className="w-3 h-3" />
                          <span>{mockup.dimensions.width} × {mockup.dimensions.height}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(mockup.dateAdded)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Processing Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-3xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Process Mockups
            {mockups.length > 0 && artworks.length > 0 && (
              <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full flex items-center gap-1">
                <Grid className="w-3 h-3" />
                {mockups.length} × {artworks.length} = {mockups.length * artworks.length} combinations
              </span>
            )}
          </h3>

          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={processAllMockups}
              disabled={artworks.length === 0 || mockups.length === 0 || processing}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
            >
              {processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Process All Combinations
                </>
              )}
            </motion.button>

            {results.length > 0 && (
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={downloadAllAsZip} className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors">
                <Download className="w-4 h-4" />
                Download ZIP
              </motion.button>
            )}
          </div>
        </div>

        {processing && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
              <span>Processing combinations...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            {currentProcessing && (
              <div className="text-xs text-slate-500 mb-2">Current: {currentProcessing}</div>
            )}
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-primary-500 to-accent-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {results.map((result, index) => (
              <motion.div key={index} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.1 }} className="bg-white/70 rounded-xl overflow-hidden border border-white/50 hover:shadow-md transition-all">
                <div className="aspect-video bg-slate-100 relative overflow-hidden">
                  <img src={result.url} alt={result.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end">
                    <button onClick={() => window.open(result.url, '_blank')} className="m-3 p-2 bg-white/90 rounded-lg hover:bg-white transition-colors">
                      <Eye className="w-4 h-4 text-slate-700" />
                    </button>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-xs text-slate-600 truncate font-medium">{result.name}</p>
                  <div className="text-xs text-slate-400 mt-1">
                    <div className="truncate">Mockup: {result.mockupName}</div>
                    <div className="truncate">Artwork: {result.artworkName}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
