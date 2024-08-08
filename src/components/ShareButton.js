import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShareAlt } from '@fortawesome/free-solid-svg-icons';
import html2canvas from 'html2canvas';
import './ShareButton.css';

const ShareButton = ({ username }) => {
    const [preview, setPreview] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);

    const handleShare = async () => {
        try {
            const graphElement = document.getElementById('graph-container'); // Ensure this ID matches the container of your graph
            if (!graphElement) {
                alert('Graph element not found.');
                return;
            }

            // Clone the graph element to avoid modifying the original graph while capturing the screenshot
            const clone = graphElement.cloneNode(true);
            document.body.appendChild(clone);

            // Ensure images are loaded
            const images = clone.getElementsByTagName('img');
            const imagePromises = Array.from(images).map((img) => new Promise((resolve) => {
                if (img.complete) {
                    resolve();
                } else {
                    img.onload = img.onerror = resolve;
                }
            }));
            await Promise.all(imagePromises);

            // Capture the screenshot
            const canvas = await html2canvas(clone, {
                scrollX: 0,
                scrollY: -window.scrollY,
                windowWidth: document.documentElement.offsetWidth,
                windowHeight: document.documentElement.scrollHeight,
                scale: 2 // Increase the scale for better quality
            });
            document.body.removeChild(clone);

            const dataUrl = canvas.toDataURL();
            setPreview(dataUrl);
            setModalOpen(true);
        } catch (error) {
            console.error('Error capturing screenshot:', error);
        }
    };

    const confirmShare = async () => {
        try {
            const response = await fetch(preview);
            const blob = await response.blob();

            if (navigator.share) {
                const filesArray = [
                    new File([blob], 'network-screenshot.png', { type: blob.type })
                ];

                navigator.share({
                    title: 'Check out my network!',
                    text: `Check out my network, ${username}!`,
                    files: filesArray,
                }).catch(error => console.error('Error sharing:', error));
            } else {
                alert('Share functionality is not supported on this browser.');
            }

            setModalOpen(false);
        } catch (error) {
            console.error('Error sharing image:', error);
        }
    };

    const closeModal = () => {
        setModalOpen(false);
    };

    const handlePreviewClick = () => {
        window.open(preview, '_blank');
    };

    return (
        <div>
            <button className="share-button" onClick={handleShare}>
                <FontAwesomeIcon icon={faShareAlt} className="share-icon" />
            </button>
            {modalOpen && (
                <div className="share-modal">
                    <div className="share-modal-content">
                        <h2>Share Preview</h2>
                        {preview && <img src={preview} alt="Graph Preview" className="share-preview-image" onClick={handlePreviewClick} />}
                        <button className="confirm-share-button" onClick={confirmShare}>Share</button>
                        <button className="cancel-share-button" onClick={closeModal}>Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShareButton;
