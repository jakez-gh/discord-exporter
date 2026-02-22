 function Save(Config, Log) {
    return {
        download(type, Extract) {
            const { text, json } = Extract.run();
            const blob = new Blob(
                [type === 'txt' ? text : JSON.stringify(json, null, 2)],
                { type: type === 'txt' ? 'text/plain' : 'application/json' }
            );

            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `discord_.${type}`;
            a.click();
        }
    };
}
