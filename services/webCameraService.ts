// Web kamera servisi
export class WebCameraService {
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;

  async requestPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Camera permission denied:', error);
      return false;
    }
  }

  async startCamera(videoElement: HTMLVideoElement): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      this.video = videoElement;
      videoElement.srcObject = this.stream;
      await videoElement.play();
    } catch (error) {
      console.error('Error starting camera:', error);
      throw error;
    }
  }

  async capturePhoto(): Promise<string> {
    if (!this.video) {
      throw new Error('Camera not initialized');
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      throw new Error('Canvas context not available');
    }

    canvas.width = this.video.videoWidth;
    canvas.height = this.video.videoHeight;
    
    context.drawImage(this.video, 0, 0);
    
    return canvas.toDataURL('image/jpeg', 0.8);
  }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.video = null;
  }
}

export const webCameraService = new WebCameraService();