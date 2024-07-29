import React from 'react';
import './Notifications.css';

const Notifications = ({ notifications }) => {
    return (
        <div className="notifications">
            <ul>
                {notifications.map((notification, index) => (
                    <li key={index}>{notification}</li>
                ))}
            </ul>
        </div>
    );
};

export default Notifications;
