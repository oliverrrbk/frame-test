import React from 'react';
import { motion } from 'framer-motion';

const PageTransition = ({ children, className = '' }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ 
                type: 'spring',
                stiffness: 260,
                damping: 20,
                mass: 0.5,
                duration: 0.4
            }}
            className={className}
            style={{ 
                width: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                flexGrow: 1,
                willChange: 'transform, opacity'
            }}
        >
            {children}
        </motion.div>
    );
};

export default PageTransition;
