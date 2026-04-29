import { useState, useEffect, useRef, useCallback } from 'react';

export function useTimer(initialSeconds = 60) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef(null);

  const start = useCallback((time = initialSeconds) => {
    setTimeLeft(time);
    setIsActive(true);
  }, [initialSeconds]);

  const pause = useCallback(() => {
    setIsActive(false);
  }, []);

  const resume = useCallback(() => {
    if (timeLeft > 0) {
      setIsActive(true);
    }
  }, [timeLeft]);

  const reset = useCallback((time = initialSeconds) => {
    setTimeLeft(time);
    setIsActive(false);
  }, [initialSeconds]);

  const addTime = useCallback((seconds) => {
    setTimeLeft((prev) => Math.max(0, prev + seconds));
  }, []);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (!isActive && timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Strict cleanup
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft]);

  return { timeLeft, start, pause, resume, reset, addTime, isActive };
}
