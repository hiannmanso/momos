import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import './Home.css';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const [albuns, setAlbuns] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [carouselIndexes, setCarouselIndexes] = useState([]);
  const [prevIndexes, setPrevIndexes] = useState([]);
  const intervalsRef = useRef([]);
  const [fadeStates, setFadeStates] = useState([]);

  useEffect(() => {
    fetchAlbuns();
  }, []);

  useEffect(() => {
    setCarouselIndexes(albuns.map(() => 0));
    setPrevIndexes(albuns.map(() => 0));
    setFadeStates(albuns.map(() => false));
    // Limpa intervalos antigos
    intervalsRef.current.forEach(clearInterval);
    intervalsRef.current = [];
    albuns.forEach((album, idx) => {
      if (album.images && album.images.length > 1) {
        const interval = setInterval(() => {
          setPrevIndexes(prev => {
            const copy = [...prev];
            copy[idx] = carouselIndexes[idx] || 0;
            return copy;
          });
          setCarouselIndexes(prev => {
            const copy = [...prev];
            copy[idx] = ((prev[idx] || 0) + 1) % album.images.length;
            return copy;
          });
          setFadeStates(prev => {
            const copy = [...prev];
            copy[idx] = true;
            return copy;
          });
          setTimeout(() => {
            setFadeStates(prev => {
              const copy = [...prev];
              copy[idx] = false;
              return copy;
            });
          }, 1200);
        }, 3000);
        intervalsRef.current.push(interval);
      } else {
        intervalsRef.current.push(null);
      }
    });
    return () => {
      intervalsRef.current.forEach(clearInterval);
    };
  }, [albuns, carouselIndexes]);

  function fetchAlbuns() {
    axios.get('http://localhost:5000/api/albuns')
      .then(res => setAlbuns(res.data))
      .catch(() => setAlbuns([]));
  }

  function handleCreateAlbum(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setLoading(true);
    setError('');
    axios.post('http://localhost:5000/api/albuns', { title: newTitle })
      .then(() => {
        setShowModal(false);
        setNewTitle('');
        fetchAlbuns();
      })
      .catch(err => {
        setError(err.response?.data?.error || 'Erro ao criar álbum');
      })
      .finally(() => setLoading(false));
  }

  return (
    <div className="home-container">
      <div className="home-card">
        <img
          src="/foto-casal.jpeg"
          alt="Foto do casal"
          className="home-image"
        />
        <h1 className="home-title">Eu e meu Momo</h1>
        <p className="home-desc">
          Aqui vai uma mensagem especial para o meu amor...
        </p>
        <button className="add-album-btn" onClick={() => setShowModal(true)}>
          + Novo Álbum
        </button>
        <div className="albuns-carousel-home">
          {albuns.length === 0 && <p className="albuns-empty">Nenhum álbum ainda</p>}
          {albuns.map((album, idx) => (
            <div className="album-preview" key={idx} onClick={() => navigate(`/albuns/${album.title}`)} style={{cursor:'pointer', position:'relative'}}>
              {album.images && album.images.length > 0 ? (
                <>
                  <img
                    src={album.images[prevIndexes[idx] || 0]}
                    alt={album.title}
                    className={`album-preview-img${fadeStates[idx] ? ' fade-out' : ''}`}
                    style={{position:'absolute', left:0, top:0, width:'100%', height:'100%', zIndex:fadeStates[idx]?1:0, opacity:fadeStates[idx]?1:0}}
                  />
                  <img
                    src={album.images[carouselIndexes[idx] || 0]}
                    alt={album.title}
                    className={`album-preview-img${fadeStates[idx] ? ' fade-in' : ''}`}
                    style={{position:'relative', zIndex:2}}
                  />
                </>
              ) : (
                <div className="album-preview-placeholder">?</div>
              )}
              <div className="album-preview-title">{album.title}</div>
            </div>
          ))}
        </div>
        {showModal && (
          <div className="modal-bg">
            <form className="modal" onSubmit={handleCreateAlbum}>
              <h3>Criar novo álbum</h3>
              <input
                type="text"
                placeholder="Título do álbum"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                autoFocus
              />
              {error && <div className="modal-error">{error}</div>}
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} disabled={loading}>Cancelar</button>
                <button type="submit" disabled={loading || !newTitle.trim()}>
                  {loading ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
} 