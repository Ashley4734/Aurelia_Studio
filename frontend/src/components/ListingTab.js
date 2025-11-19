import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { FileText, Upload, Zap, Copy, Check, RefreshCw, Edit2, Tag, DollarSign, Sparkles } from 'lucide-react';

export default function ListingTab() {
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [listing, setListing] = useState(null);
  const [editedListing, setEditedListing] = useState(null);
  const [editingField, setEditingField] = useState(null);

  const dropzone = useDropzone({
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    multiple: false,
    onDrop: (files) => {
      if (files[0]) {
        const file = files[0];
        setImage(file);
        setPreviewUrl(URL.createObjectURL(file));
        setListing(null);
        setEditedListing(null);
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
        setEditedListing(data);
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

  const updateField = (field, value) => {
    setEditedListing({ ...editedListing, [field]: value });
  };

  const getCharCount = (text) => {
    return text ? text.length : 0;
  };

  const CharCounter = ({ current, max, warning = 0.9 }) => {
    const percentage = current / max;
    const color = percentage > warning ? 'text-red-600' : percentage > 0.7 ? 'text-amber-600' : 'text-slate-500';
    return (
      <span className={`text-xs ${color} font-medium`}>
        {current}/{max}
      </span>
    );
  };

  const EditableField = ({ label, value, field, maxLength, multiline = false, icon: Icon }) => {
    const isEditing = editingField === field;
    return (
      <div className="bg-white/50 rounded-xl p-4 hover:bg-white/70 transition-all">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-primary-500" />}
            <h5 className="font-medium text-slate-800">{label}</h5>
            {maxLength && <CharCounter current={getCharCount(value)} max={maxLength} />}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditingField(isEditing ? null : field)}
              className="text-slate-500 hover:text-primary-600 transition-colors"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => copyToClipboard(value, label)}
              className="text-primary-500 hover:text-primary-700 transition-colors"
              title="Copy"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
        {isEditing ? (
          multiline ? (
            <textarea
              value={value}
              onChange={(e) => updateField(field, e.target.value)}
              className="w-full p-3 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-slate-700"
              rows={6}
              maxLength={maxLength}
            />
          ) : (
            <input
              type="text"
              value={value}
              onChange={(e) => updateField(field, e.target.value)}
              className="w-full p-3 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-slate-700"
              maxLength={maxLength}
            />
          )
        ) : (
          <p className="text-slate-700 whitespace-pre-wrap">{value}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-8 border border-white/20">
        <h3 className="text-2xl font-semibold text-slate-800 mb-6 flex items-center gap-3">
          <FileText className="w-6 h-6 text-primary-500" />
          Etsy Listing Generator
        </h3>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>✨ Optimized for Etsy:</strong> Generates complete listings with SEO-optimized titles, 13 tags, comprehensive descriptions, and pricing suggestions for Frame TV digital art.
          </p>
        </div>
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
              <p className="text-slate-500">AI will analyze your image and create an Etsy-optimized listing</p>
            </>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            onClick={generateListing}
            disabled={!image || generating}
            className="flex-1 flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-2xl font-semibold text-lg disabled:opacity-50 hover:shadow-lg transition-all"
          >
            {generating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing Artwork...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Etsy Listing
              </>
            )}
          </motion.button>
          {listing && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              onClick={generateListing}
              disabled={generating}
              className="px-6 py-4 bg-white border-2 border-primary-300 text-primary-600 rounded-2xl font-semibold hover:bg-primary-50 transition-all disabled:opacity-50"
            >
              <RefreshCw className="w-5 h-5" />
            </motion.button>
          )}
        </div>
      </motion.div>

      {editedListing && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-8 border border-white/20">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-xl font-semibold text-slate-800">Generated Etsy Listing</h4>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 bg-green-100 px-3 py-1 rounded-full flex items-center gap-1">
                <Check className="w-3 h-3" />
                Etsy Optimized
              </span>
            </div>
          </div>

          <div className="space-y-6">
            {/* Primary Title */}
            <EditableField
              label="Title (Primary)"
              value={editedListing.title}
              field="title"
              maxLength={140}
              icon={FileText}
            />

            {/* SEO Title */}
            {editedListing.seoTitle && (
              <EditableField
                label="Title (SEO Variation)"
                value={editedListing.seoTitle}
                field="seoTitle"
                maxLength={140}
                icon={Sparkles}
              />
            )}

            {/* Short Description */}
            {editedListing.shortDescription && (
              <EditableField
                label="Short Description"
                value={editedListing.shortDescription}
                field="shortDescription"
                multiline
                icon={FileText}
              />
            )}

            {/* Full Description */}
            <EditableField
              label="Full Description"
              value={editedListing.description || editedListing.story}
              field={editedListing.description ? "description" : "story"}
              multiline
              icon={FileText}
            />

            {/* Tags */}
            <div className="bg-white/50 rounded-xl p-4 hover:bg-white/70 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary-500" />
                  <h5 className="font-medium text-slate-800">Tags</h5>
                  <span className={`text-xs font-medium ${editedListing.tags?.length === 13 ? 'text-green-600' : 'text-amber-600'}`}>
                    {editedListing.tags?.length || 0}/13
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(editedListing.tags?.join(', ') || '', 'Tags')}
                  className="text-primary-500 hover:text-primary-700 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {editedListing.tags?.map((tag, index) => (
                  <span key={index} className="px-3 py-1.5 bg-gradient-to-r from-primary-100 to-accent-100 text-primary-700 rounded-full text-sm font-medium border border-primary-200">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Materials */}
            {editedListing.materials && (
              <EditableField
                label="Materials / What's Included"
                value={editedListing.materials}
                field="materials"
                icon={FileText}
              />
            )}

            {/* Keywords */}
            {editedListing.keywords && (
              <div className="bg-white/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary-500" />
                    <h5 className="font-medium text-slate-800">SEO Keywords</h5>
                  </div>
                  <button
                    onClick={() => copyToClipboard(editedListing.keywords?.join(', ') || '', 'Keywords')}
                    className="text-primary-500 hover:text-primary-700"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-slate-700 text-sm">{editedListing.keywords?.join(', ')}</p>
              </div>
            )}

            {/* Metadata Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Price */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <p className="text-sm font-medium text-green-800">Suggested Price</p>
                </div>
                <p className="text-2xl font-bold text-green-700">${editedListing.suggestedPrice}</p>
              </div>

              {/* Shop Section */}
              {editedListing.shopSection && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                  <p className="text-sm font-medium text-blue-800 mb-2">Shop Section</p>
                  <p className="text-lg font-semibold text-blue-700">{editedListing.shopSection}</p>
                </div>
              )}

              {/* Style */}
              {editedListing.style && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                  <p className="text-sm font-medium text-purple-800 mb-2">Art Style</p>
                  <p className="text-lg font-semibold text-purple-700">{editedListing.style}</p>
                </div>
              )}
            </div>

            {/* Colors */}
            {editedListing.colors && editedListing.colors.length > 0 && (
              <div className="bg-white/50 rounded-xl p-4">
                <h5 className="font-medium text-slate-800 mb-3">Color Palette</h5>
                <div className="flex flex-wrap gap-2">
                  {editedListing.colors.map((color, index) => (
                    <span key={index} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
                      {color}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Target Audience */}
            {editedListing.targetAudience && (
              <div className="bg-white/50 rounded-xl p-4">
                <h5 className="font-medium text-slate-800 mb-2">Target Audience</h5>
                <p className="text-slate-700 text-sm">{editedListing.targetAudience}</p>
              </div>
            )}

            {/* Copy All Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                const fullText = `TITLE:\n${editedListing.title}\n\n` +
                  (editedListing.seoTitle ? `SEO TITLE:\n${editedListing.seoTitle}\n\n` : '') +
                  `DESCRIPTION:\n${editedListing.description || editedListing.story}\n\n` +
                  `TAGS:\n${editedListing.tags?.join(', ')}\n\n` +
                  (editedListing.materials ? `MATERIALS:\n${editedListing.materials}\n\n` : '') +
                  `PRICE: $${editedListing.suggestedPrice}\n` +
                  `SECTION: ${editedListing.shopSection}`;
                copyToClipboard(fullText, 'Complete listing');
              }}
              className="w-full py-4 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-2xl font-semibold text-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Copy className="w-5 h-5" />
              Copy Complete Listing
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
