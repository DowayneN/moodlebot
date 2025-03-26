
import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const Logo: React.FC<LogoProps> = ({ size = 'md' }) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  return (
    <div className={`${sizeMap[size]} rounded-full overflow-hidden bg-moodle-orange flex items-center justify-center`}>
      <img 
        src="/lovable-uploads/d333523b-6a95-46ae-b24d-cb5fb63ce7a5.png" 
        alt="MoodleBot" 
        className="object-contain w-full h-full"
      />
    </div>
  );
};

export default Logo;
