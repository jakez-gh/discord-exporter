 function UpgradeStickers(Extract) {
    Extract.register((li, msg) => {
        const nodes = li.querySelectorAll('[data-type="sticker"]');
        msg.stickers = [...nodes].map(n => ({
            id: n.getAttribute('data-id'),
            name: n.getAttribute('data-name')
        }));
    });
}
