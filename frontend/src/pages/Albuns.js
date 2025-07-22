import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Albuns.css';

// Defina a URL base da API aqui para facilitar a troca entre localhost e produção
const API_BASE_URL = 'https://momos-qu63.onrender.com';

export default function Albuns() {
  const { album } = useParams();
  const navigate = useNavigate();
  const [albumData, setAlbumData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [current, setCurrent] = useState(0);
  const fileInputRef = useRef();
  const [fade, setFade] = useState(false);

  useEffect(() => {
    fetchAlbum();
    // eslint-disable-next-line
  }, [album]);

  const hasImages = albumData && albumData.images && albumData.images.length > 0;
  const total = hasImages ? albumData.images.length : 0;

  useEffect(() => {
    if (!hasImages) return;
    setFade(false);
    let interval;
    const timer = setTimeout(() => setFade(true), 10);
    let paused = false;
    // Função para pausar o carrossel
    window.pauseCarousel = () => { paused = true; clearInterval(interval); };
    window.resumeCarousel = () => {
      if (!paused) return;
      paused = false;
      interval = setInterval(() => {
        setCurrent(prev => (prev + 1) % total);
      }, 5000);
    };
    interval = setInterval(() => {
      if (!paused) setCurrent(prev => (prev + 1) % total);
    }, 5000);
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
      window.pauseCarousel = undefined;
      window.resumeCarousel = undefined;
    };
  }, [current, total, hasImages]);

  function fetchAlbum() {
    setLoading(true);
    axios.get(`${API_BASE_URL}/api/albuns`)
      .then(res => {
        const found = res.data.find(a => a.title === album);
        setAlbumData(found);
        setCurrent(0);
      })
      .catch(() => setAlbumData(null))
      .finally(() => setLoading(false));
  }

  function handleUpload(e) {
    if (!fileInputRef.current.files.length) return;
    setUploading(true);
    setError('');
    const formData = new FormData();
    formData.append('album', album);
    for (let file of fileInputRef.current.files) {
      formData.append('images', file);
    }
    axios.post(`${API_BASE_URL}/api/albuns/${album}/upload`, formData)
      .then(() => {
        fetchAlbum();
        fileInputRef.current.value = '';
      })
      .catch(() => setError('Erro ao enviar imagens'))
      .finally(() => setUploading(false));
  }

  function handleDeleteImage(idx) {
    if (!window.confirm('Tem certeza que deseja excluir essa foto?')) return;
    const image = albumData.images[idx];
    axios.delete(`${API_BASE_URL}/api/albuns/${album}/image`, {
      data: { image }
    })
      .then(() => fetchAlbum())
      .catch(() => setError('Erro ao excluir a foto.'));
  }

  if (loading) return <div className="albuns-container"><div className="albuns-title">Carregando...</div></div>;
  if (!albumData) return <div className="albuns-container"><div className="albuns-title">Álbum não encontrado</div></div>;

  return (
    <div className="albuns-container">
      <div className="album-header">
        <h2 className="albuns-title" style={{cursor:'pointer'}} onClick={() => navigate('/')}>{albumData.title}</h2>
      </div>
      <div className="carousel-wrapper">
        {hasImages ? (
          <div className="carousel-touch">
            <div
              className="carousel-zone carousel-zone-left"
              onClick={() => { setCurrent((current - 1 + total) % total); setFade(false); }}
              style={{height: '100%'}}
            />
            <img
              src={albumData.images[current]}
              alt={albumData.title}
              className={`carousel-img${fade ? ' fade-in' : ''}`}
              onAnimationEnd={() => setFade(false)}
            />
            <div className="carousel-dots-wrapper">
              {[...Array(3)].map((_, i) => {
                // Calcula o índice da foto para cada bolinha
                let idx;
                if (i === 0) idx = (current - 1 + total) % total;
                else if (i === 1) idx = current;
                else idx = (current + 1) % total;
                return (
                  <div
                    key={i}
                    className={`carousel-dot${i === 1 ? ' active' : ''}`}
                    onClick={() => setCurrent(idx)}
                  />
                );
              })}
            </div>
            <div
              className="carousel-zone carousel-zone-right"
              onClick={() => { setCurrent((current + 1) % total); setFade(false); }}
              style={{height: '100%'}}
            />
          </div>
        ) : (
          <div className="albuns-empty">Nenhuma foto ainda</div>
        )}
      </div>
      <div className="carousel-actions">
        <form className="upload-form" onSubmit={handleUpload}>
          <input type="file" name="images" multiple ref={fileInputRef} accept="image/*" style={{ display: 'none' }} id="upload-input" onChange={handleUpload} />
          <button type="button" onClick={() => fileInputRef.current.click()} disabled={uploading} className="add-img-btn">
            {uploading ? 'Enviando...' : 'Adicionar Foto'}
          </button>
        </form>
        {hasImages && (
          <button className="delete-img-btn" onClick={() => { window.pauseCarousel && window.pauseCarousel(); handleDeleteImage(current); window.resumeCarousel && window.resumeCarousel(); }}>Excluir foto</button>
        )}
        {hasImages && (
          <a
            href={albumData.images[current]}
            download={albumData.images[current]?.split('/').pop()}
            className="download-img-btn"
            style={{textDecoration: 'none'}}
          >
            <button type="button" className="download-img-btn">Baixar imagem</button>
          </a>
        )}
      </div>
      {error && <div className="modal-error">{error}</div>}
    </div>
  );
} 