// Configuration des trois paliers.
export const LEVELS = {
  1: { id: 1, name: 'Découverte', icon: '🌱', auctions: false, mortgage: false, trade: false, build: false, minutes: 20, aids: true, hint: 'Facile : on achète, on gagne des loyers.' },
  2: { id: 2, name: 'Classique', icon: '🏠', auctions: true, mortgage: true, trade: true, build: true, minutes: 45, aids: true, hint: 'Toutes les règles, avec des aides.' },
  3: { id: 3, name: 'Complet', icon: '🏰', auctions: true, mortgage: true, trade: true, build: true, minutes: 0, aids: false, hint: 'Toutes les règles, sans aide.' },
};
export const DURATIONS = [20, 45, 60, 0]; // minutes, 0 = libre
