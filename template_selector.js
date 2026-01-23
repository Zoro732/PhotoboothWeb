// Gestion de la sélection des templates par les boutons
document.addEventListener('DOMContentLoaded', () => {
    const templateSelection = document.getElementById('template_selection');
    const template1 = document.getElementById('template1');
    const template2 = document.getElementById('template2');
    const template3 = document.getElementById('template3');
    const templateElements = [template1, template2, template3].filter(Boolean);

    if (templateSelection && templateElements.length > 0) {
        const buttons = templateSelection.querySelectorAll('.template_option');
        
        buttons.forEach((btn, idx) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log(`Template ${idx + 1} selected`);
                
                // Masquer tous les templates
                templateElements.forEach(tpl => {
                    if (tpl) tpl.style.display = 'none';
                });
                
                // Afficher le template sélectionné
                if (templateElements[idx]) {
                    templateElements[idx].style.display = 'block';
                }
                
                // Optionnel: ajouter une classe active au bouton
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }
});
