 function UpgradeAttachments(Extract) {
    Extract.register((li, msg) => {
        msg.attachments = [...li.querySelectorAll('a[href*="cdn.discordapp.com"]')]
            .map(a => a.href);
    });
}
