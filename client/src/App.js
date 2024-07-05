import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [paragraphs, setParagraphs] = useState([]);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setFileName(selectedFile ? selectedFile.name : '');
  };

  const handleDocumentUpload = async () => {
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      setLoading(true); 
      try {
        const response = await axios.post('http://localhost:5002/api/upload', formData);
        setParagraphs(response.data.paragraphs);
        alert('Document upload successful');
      } catch (error) {
        console.error('Error uploading document:', error);
        alert('Document upload failed');
      } finally {
        setLoading(false); 
      }
    }
  };

  return (
    <div className="App">
      <h1>Document Scoring System</h1>
      <div className="document-upload">
        <label className="button">
          Choose File
          <input type="file" onChange={handleFileChange} />
        </label>
        <button className="button" onClick={handleDocumentUpload}>Upload Document</button>
        {fileName && <p className="file-name">Selected file: {fileName}</p>}
      </div>
      <div className="paragraph-list">
        {loading ? (
          <p>Loading...</p>
        ) : (
          paragraphs.map(({ paragraph, alreadyExists }) => (
            <div key={paragraph._id} className="paragraph-item">
              <p>{paragraph.text}</p>
              <p><strong>Score:</strong> {paragraph.score}</p>
              {alreadyExists && <p className="already-exists">(Already found in database)</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;
