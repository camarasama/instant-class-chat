// src/components/channels/ChannelList.jsx
import React, { useState, useEffect } from 'react';
import { channelAPI } from '../../services/api.js';

const ChannelList = ({ onChannelSelect, activeChannel }) => {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    try {
      const response = await channelAPI.getAll();
      setChannels(response.data.data);
    } catch (error) {
      console.error('Failed to load channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    try {
      const response = await channelAPI.create({
        name: newChannelName,
        description: newChannelDescription
      });
      
      setChannels(prev => [response.data.data, ...prev]);
      setNewChannelName('');
      setNewChannelDescription('');
      setShowCreateModal(false);
      
      // Auto-select the new channel
      onChannelSelect(response.data.data);
    } catch (error) {
      console.error('Failed to create channel:', error);
      alert('Failed to create channel');
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-gray-600">Loading channels...</div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Channels</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700"
            title="Create new channel"
          >
            +
          </button>
        </div>
      </div>

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto">
        {channels.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No channels yet. Create one!
          </div>
        ) : (
          channels.map(channel => (
            <div
              key={channel.id}
              onClick={() => onChannelSelect(channel)}
              className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                activeChannel?.id === channel.id ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              <div className="font-medium text-gray-900"># {channel.name}</div>
              <div className="text-sm text-gray-500 truncate">
                {channel.description || 'No description'}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {channel._count.members} members • {channel._count.messages} messages
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Channel Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Create New Channel</h3>
            <form onSubmit={handleCreateChannel}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Channel Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    className="form-input w-full"
                    placeholder="e.g., general-chat"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={newChannelDescription}
                    onChange={(e) => setNewChannelDescription(e.target.value)}
                    className="form-input w-full"
                    rows="3"
                    placeholder="What's this channel about?"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn bg-gray-300 text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Create Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChannelList;