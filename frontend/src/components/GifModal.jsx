import React, { useState } from 'react';
import { X, Search, Sparkles } from 'lucide-react';

const CURATED_GIFS = [
  {
    id: '1',
    title: 'Mind Blown',
    category: 'Reactions',
    tags: ['mind blown', 'wow', 'shock', 'omg'],
    url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif'
  },
  {
    id: '2',
    title: 'Cat Vibing',
    category: 'Vibes',
    tags: ['cat', 'music', 'dance', 'vibe', 'happy'],
    url: 'https://media.giphy.com/media/jpbnoe3UIa8TU8LM13/giphy.gif'
  },
  {
    id: '3',
    title: 'Thumbs Up',
    category: 'Reactions',
    tags: ['thumbs up', 'yes', 'approve', 'great', 'cool'],
    url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif'
  },
  {
    id: '4',
    title: 'Popcorn Eating',
    category: 'Entertainment',
    tags: ['popcorn', 'drama', 'watching', 'interesting', 'fun'],
    url: 'https://media.giphy.com/media/gl0mkIZOW6Nwc/giphy.gif'
  },
  {
    id: '5',
    title: 'Excited Celebration',
    category: 'Celebration',
    tags: ['celebrate', 'party', 'confetti', 'yay', 'win'],
    url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif'
  },
  {
    id: '6',
    title: 'Dancing Dog',
    category: 'Vibes',
    tags: ['dance', 'party', 'dog', 'groove'],
    url: 'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif'
  },
  {
    id: '7',
    title: 'Mic Drop',
    category: 'Reactions',
    tags: ['mic drop', 'done', 'boom', 'savage'],
    url: 'https://media.giphy.com/media/3o7qDSOvfaCO9b3MlO/giphy.gif'
  },
  {
    id: '8',
    title: 'Laughing Out Loud',
    category: 'Reactions',
    tags: ['laugh', 'lol', 'haha', 'funny', 'joke'],
    url: 'https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif'
  },
  {
    id: '9',
    title: 'High Five',
    category: 'Celebration',
    tags: ['high five', 'team', 'friends', 'awesome'],
    url: 'https://media.giphy.com/media/3oEjHV0z8S7WM4MwnK/giphy.gif'
  },
  {
    id: '10',
    title: 'Hacker Coding',
    category: 'Work',
    tags: ['code', 'hacker', 'typing', 'computer', 'fast'],
    url: 'https://media.giphy.com/media/ule4akeEDWA0g/giphy.gif'
  },
  {
    id: '11',
    title: 'Clapping Ovation',
    category: 'Celebration',
    tags: ['clap', 'applause', 'bravo', 'congrats'],
    url: 'https://media.giphy.com/media/3oz8xAFtqoOUUrsh7W/giphy.gif'
  },
  {
    id: '12',
    title: 'Shocked Face',
    category: 'Reactions',
    tags: ['shock', 'surprised', 'gasp', 'unbelievable'],
    url: 'https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif'
  }
];

export default function GifModal({ isOpen, onClose, onSelectGif }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  if (!isOpen) return null;

  const categories = ['All', 'Reactions', 'Celebration', 'Vibes', 'Entertainment', 'Work'];

  const filteredGifs = CURATED_GIFS.filter(gif => {
    const matchesCategory = selectedCategory === 'All' || gif.category === selectedCategory;
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = !term || 
      gif.title.toLowerCase().includes(term) || 
      gif.tags.some(t => t.includes(term));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card gif-modal animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} color="#a855f7" />
            <h2>Choose a GIF</h2>
          </div>
          <button className="icon-btn" onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>

        <div className="gif-modal-content">
          {/* Search Bar */}
          <div className="gif-search-wrapper">
            <Search size={16} className="gif-search-icon" />
            <input
              type="text"
              placeholder="Search GIFs by emotion, meme, or tag..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              autoFocus
            />
            {searchTerm && (
              <button className="gif-search-clear" onClick={() => setSearchTerm('')}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div className="gif-category-chips">
            {categories.map(cat => (
              <button
                key={cat}
                className={`gif-chip ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* GIF Grid */}
          <div className="gif-grid">
            {filteredGifs.length > 0 ? (
              filteredGifs.map(gif => (
                <div
                  key={gif.id}
                  className="gif-item"
                  onClick={() => {
                    onSelectGif(gif.url, gif.title);
                    onClose();
                  }}
                  title={gif.title}
                >
                  <img src={gif.url} alt={gif.title} loading="lazy" />
                  <div className="gif-item-overlay">
                    <span>{gif.title}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="gif-no-results">
                No GIFs found for "{searchTerm}". Try another search term!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
