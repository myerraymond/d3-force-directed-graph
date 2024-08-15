import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShareAlt } from '@fortawesome/free-solid-svg-icons';
import html2canvas from 'html2canvas';
import './ShareButton.css';

const ShareButton = ({ username }) => {
    const [preview, setPreview] = useState(null);

    const handleShare = async () => {
        try {
            const graphElement = document.querySelector('.main-page');
            if (!graphElement) {
                alert('Graph element not found.');
                return;
            }

            const clone = graphElement.cloneNode(true);
            const container = document.createElement('div');
            container.style.position = 'relative';
            container.style.padding = '20px';
            container.style.backgroundColor = '#fff';
            container.style.border = '2px solid #000';
            container.style.width = `${graphElement.offsetWidth}px`;
            container.style.height = `${graphElement.offsetHeight}px`;

            const usernameElement = document.createElement('div');
            usernameElement.style.position = 'absolute';
            usernameElement.style.top = '10px';
            usernameElement.style.left = '50%';
            usernameElement.style.transform = 'translateX(-50%)';
            usernameElement.style.fontSize = '24px';
            usernameElement.style.fontWeight = 'bold';
            usernameElement.style.color = '#000';
            usernameElement.textContent = username;
            container.appendChild(usernameElement);

            clone.style.marginTop = '50px';
            container.appendChild(clone);
            document.body.appendChild(container);

            // Ensure all images are loaded before capturing the screenshot
            const images = clone.getElementsByTagName('img');
            const imagePromises = Array.from(images).map(img => {
                return new Promise((resolve, reject) => {
                    if (img.complete) {
                        resolve(img.src);
                    } else {
                        img.onload = () => resolve(img.src);
                        img.onerror = () => reject(new Error('Image failed to load'));
                    }
                });
            });

            try {
                const imageUrls = await Promise.all(imagePromises);

                // Replace image src attributes with Data URIs
                const dataUrlPromises = imageUrls.map(url => {
                    return fetch(url)
                        .then(response => response.blob())
                        .then(blob => {
                            const reader = new FileReader();
                            return new Promise((resolve, reject) => {
                                reader.onloadend = () => resolve(reader.result);
                                reader.onerror = reject;
                                reader.readAsDataURL(blob);
                            });
                        });
                });

                const dataUrls = await Promise.all(dataUrlPromises);
                Array.from(images).forEach((img, index) => {
                    img.src = dataUrls[index];
                });

            } catch (error) {
                console.error('Error processing images:', error);
                document.body.removeChild(container);
                return;
            }

            // Capture screenshot with modified elements
            const canvas = await html2canvas(container, {
                scrollX: 0,
                scrollY: -window.scrollY,
                windowWidth: document.documentElement.offsetWidth,
                windowHeight: document.documentElement.scrollHeight,
                scale: 2, // Increase the scale for better quality
                useCORS: true, // Enable Cross-Origin Resource Sharing for images
            });
            document.body.removeChild(container);

            const dataUrl = canvas.toDataURL();
            setPreview(dataUrl); // Set the preview data URL

        } catch (error) {
            console.error('Error capturing screenshot:', error);
        }
    };

    return (
        <div>
            <button className="share-button" onClick={handleShare}>
                <FontAwesomeIcon icon={faShareAlt} className="share-icon" />
            </button>
            {preview && (
                <div className="screenshot-preview">
                    <h2>Screenshot Preview</h2>
                    <img src={preview} alt="Graph Screenshot" className="screenshot-preview-image" />
                </div>
            )}
        </div>
    );
};

export default ShareButton;
