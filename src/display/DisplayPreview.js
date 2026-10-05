import { AppError } from '../app-error';

export class DisplayPreview {
    constructor() {
        this.container = document.querySelector('#display-preview');

        if (!this.container) {
            throw new AppError("Document does not contain display preview container.");
        }

        this.image = document.createElement('img');
        this.image.className = 'display-preview-image';

        this.container.append(this.image);
    }

    async show(canvas) {
        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob(result => {
                if (result) {
                    resolve(result);
                }
                else {
                    reject(new AppError("Unable to create display preview image."));
                }
            }, 'image/png');
        });

        const url = URL.createObjectURL(blob);
        this.image.src = url;
    }
}