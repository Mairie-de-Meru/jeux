// Grille des couvertures. Les images absentes du manifeste valent null (repli couleur + emoji).
export function renderLibrary(container, stories, onOpen) {
  container.replaceChildren();
  for (const story of stories) {
    const card = document.createElement('button');
    card.className = 'cover-card';
    card.type = 'button';
    card.style.setProperty('--couleur', story.couleur);
    card.style.setProperty('--i', container.children.length);
    card.setAttribute('aria-label', story.titre);

    const art = document.createElement('span');
    art.className = 'cover-art';
    if (story.couverture) {
      const img = document.createElement('img');
      img.src = story.couverture;
      img.alt = '';
      art.appendChild(img);
    } else {
      art.textContent = '🦊';
    }

    const title = document.createElement('span');
    title.className = 'cover-title';
    title.textContent = story.titre;

    card.append(art, title);
    card.addEventListener('click', () => onOpen(story.id));
    container.appendChild(card);
  }
}
