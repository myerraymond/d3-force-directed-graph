import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShareAlt } from '@fortawesome/free-solid-svg-icons';
import './ShareButton.css';

const ShareButton = () => {
    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: 'Check out my network!',
                url: window.location.href,
            }).catch(error => console.error('Error sharing:', error));
        } else {
            alert('Share functionality is not supported on this browser.');
        }
    };

    return (
        <button className="share-button" onClick={handleShare}>
            <FontAwesomeIcon icon={faShareAlt} className="share-icon" />
        </button>
    );
};

export default ShareButton;
