const cards = document.querySelectorAll('.card');
cards.forEach(card => {
    card.addEventListener("mouseenter", (event) => {
        card.classList.remove('is-resetting');
    });

    card.addEventListener("mousemove", (event) => {
        
        const rect = card.getBoundingClientRect();
        
        const x = (event.clientX - rect.left) - (card.clientWidth / 2);
        const y = -((event.clientY - rect.top) - (card.clientHeight / 2));

        const percentX = x / (card.clientWidth / 2);
        const percentY = y / (card.clientHeight / 2);
        const maxAngle = 15;
        card.style.transform = `perspective(950px) rotateX(${percentY * maxAngle}deg) rotateY(${percentX *maxAngle}deg)`;
    });
    
    card.addEventListener("mouseleave", (event) => {
        card.classList.add('is-resetting');
        card.style.transform = `rotateX(0deg) rotateY(0deg)`;

    });

});