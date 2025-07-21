import React from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';
import Home from './pages/Home';
import Albuns from './pages/Albuns';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/albuns" element={<Albuns />} />
      <Route path="/albuns/:album" element={<Albuns />} />
    </Routes>
  );
}

export default App;
