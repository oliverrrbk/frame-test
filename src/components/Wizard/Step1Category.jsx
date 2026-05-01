import React from 'react';

import { initialCategories } from './questionsConfig';

const Step1Category = ({ projectData, updateCategory, disabledCategories, carpenter }) => {
    const categories = initialCategories.map(c => ({...c, title: c.label}));

    const handleSelect = (categoryId) => {
        updateCategory(categoryId);
    };

    return (
        <div className="wizard-step active">
            <div className="step-header header-with-avatar">
                <div className="header-text">
                    <h2>Hej, det er {carpenter?.owner_name ? carpenter.owner_name.split(' ')[0] : 'William'}</h2>
                    <p>Jeg ser frem til at blive en del af dit projekt. Hvilken opgave skal du have lavet?</p>
                </div>
                <div className="header-avatar">
                    <img src={carpenter?.portrait_url || `https://ui-avatars.com/api/?name=${carpenter?.owner_name || 'Tømrer'}&background=0f172a&color=fff&size=250`} alt={carpenter?.owner_name || "Tømrer"} />
                </div>
            </div>
            
            <div className="card-grid">
                {categories.filter(c => !(disabledCategories || []).includes(c.id)).map(cat => (
                    <div 
                        key={cat.id} 
                        className={`card ${projectData.category === cat.id ? 'selected' : ''}`}
                        onClick={() => handleSelect(cat.id)}
                    >
                        <img src={cat.img} alt={cat.title} className="card-image" />
                        <div className="card-content">
                            <h3>{cat.title}</h3>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Step1Category;
