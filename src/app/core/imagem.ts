// Lê uma imagem escolhida pelo usuário e devolve um quadrado pequeno (data URL JPEG).
// "cover": a imagem preenche o quadrado e as sobras das bordas são cortadas (ideal para foto de rosto).
export function reduzirParaQuadrado(arquivo: File, lado = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!arquivo.type.startsWith('image/')) {
      reject(new Error('Escolha um arquivo de imagem (PNG, JPG ou WebP).'));
      return;
    }
    if (arquivo.size > 8 * 1024 * 1024) {
      reject(new Error('A imagem é grande demais. Use uma de até 8 MB.'));
      return;
    }

    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error('Não foi possível ler este arquivo.'));
    leitor.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Não foi possível abrir esta imagem.'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = lado;
        canvas.height = lado;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível processar a imagem.'));
          return;
        }
        const escala = Math.max(lado / img.width, lado / img.height);
        const w = img.width * escala;
        const h = img.height * escala;
        ctx.fillStyle = '#ffffff'; // JPEG não tem transparência
        ctx.fillRect(0, 0, lado, lado);
        ctx.drawImage(img, (lado - w) / 2, (lado - h) / 2, w, h);

        let dados = canvas.toDataURL('image/jpeg', 0.85);
        if (dados.length > 150_000) {
          dados = canvas.toDataURL('image/jpeg', 0.7);
        }
        resolve(dados);
      };
      img.src = leitor.result as string;
    };
    leitor.readAsDataURL(arquivo);
  });
}