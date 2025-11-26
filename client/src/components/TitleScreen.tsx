import React from 'react';

interface TitleScreenProps {
    onNewGame: () => void;
    onLoadGame: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onNewGame, onLoadGame }) => {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundImage: "url('/title-background.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            alignItems: 'center',
            paddingBottom: '10vh',
            zIndex: 1000, // Ensure it's on top
        }}>
            <div style={{ display: 'flex', gap: '2rem', marginBottom: '100px' }}>
                <button
                    onClick={onNewGame}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-text-main)',
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
                        fontFamily: 'inherit', // Inherit font from app
                        padding: '10px 20px',
                        transition: 'transform 0.1s ease, color 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.color = 'var(--color-highlight)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.color = 'var(--color-text-main)';
                    }}
                >
                    New Game
                </button>
                <button
                    onClick={onLoadGame}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-text-main)',
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
                        fontFamily: 'inherit',
                        padding: '10px 20px',
                        transition: 'transform 0.1s ease, color 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.color = 'var(--color-highlight)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.color = 'var(--color-text-main)';
                    }}
                >
                    Load Game
                </button>
            </div>
        </div>
    );
};
