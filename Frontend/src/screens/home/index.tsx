import { ColorSwatch, Group } from '@mantine/core';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import Draggable from 'react-draggable';
import { SWATCHES } from '@/constants';

interface Response {
  expr: string;
  result: string;
  assign: boolean;
}

declare global {
  interface Window {
    MathJax?: any;
  }
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('rgb(255, 255, 255)');
  const [reset, setReset] = useState(false);
  const [dictOfVars, setDictOfVars] = useState<Record<string, string>>({});
  const [latexPosition, setLatexPosition] = useState({ x: 10, y: 200 });
  const [latexExpressions, setLatexExpressions] = useState<string[]>([]);

  useEffect(() => {
    if (latexExpressions.length > 0 && window.MathJax) {
      setTimeout(() => {
        window.MathJax.Hub.Queue(['Typeset', window.MathJax.Hub]);
      }, 0);
    }
  }, [latexExpressions]);

  useEffect(() => {
    if (reset) {
      resetCanvas();
      setLatexExpressions([]);
      setDictOfVars({});
      setReset(false);
    }
  }, [reset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight - canvas.offsetTop;
        ctx.lineCap = 'round';
        ctx.lineWidth = 3;
      }
    }

    const script = document.createElement('script');
    script.src =
      'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML';
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      if (window.MathJax) {
        window.MathJax.Hub.Config({
          tex2jax: { inlineMath: [['$', '$'], ['\\(', '\\)']] },
        });
      }
    };

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const resetCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        setIsDrawing(true);
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = color;
        ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const runRoute = async () => {
    const canvas = canvasRef.current;

    if (canvas) {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/calculate`, {
        image: canvas.toDataURL('image/png'),
        dict_of_vars: dictOfVars,
      });

      const respData: Response[] = response.data.data;
      console.log('Response:', respData);

      respData.forEach((data) => {
        if (data.assign) {
          setDictOfVars((prev) => ({ ...prev, [data.expr]: data.result }));
        }
      });

      if (respData.length > 0) {
        const firstData = respData[0];
        setLatexExpressions((prev) => [
          ...prev,
          `\\(\\LARGE{${firstData.expr} = ${firstData.result}}\\)`,
        ]);
      }
    }
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-2 p-4">
        <Button
          onClick={() => setReset(true)}
          className="z-20 bg-black text-white"
          variant="default"
        >
          Reset
        </Button>
        <Group className="z-20">
          {SWATCHES.map((swatch) => (
            <ColorSwatch key={swatch} color={swatch} onClick={() => setColor(swatch)} />
          ))}
        </Group>
        <Button
          onClick={runRoute}
          className="z-20 bg-black text-white"
          variant="default"
        >
          Run
        </Button>
      </div>
      <canvas
        ref={canvasRef}
        id="canvas"
        className="absolute top-0 left-0 w-full h-full"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
      />
      {latexExpressions.map((latex, index) => (
        <Draggable
          key={index}
          defaultPosition={latexPosition}
          onStop={(_, data) => setLatexPosition({ x: data.x, y: data.y })}
        >
          <div className="absolute p-2 text-white rounded shadow-md">
            <div className="latex-content">{latex}</div>
          </div>
        </Draggable>
      ))}
    </>
  );
}
