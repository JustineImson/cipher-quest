import { useState, useEffect, useRef, useCallback } from 'react';

export function useTimer(initialSeconds = 60) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef(null);
  // Keep a ref so callbacks always see the latest timeLeft without
  // needing it in their dependency arrays (avoids stale-closure bugs).
  const timeLeftRef = useRef(timeLeft);
  timeLeftRef.current = timeLeft;

  const start = useCallback((time = initialSeconds) => {
    setTimeLeft(time);
    timeLeftRef.current = time;
    setIsActive(true);
  }, [initialSeconds]);

  const pause = useCallback(() => {
    setIsActive(false);
  }, []);

  const resume = useCallback(() => {
    // Read from the ref so we always see the latest value,
    // even if this callback was created before a recent start().
    if (timeLeftRef.current > 0) {
      setIsActive(true);
    }
  }, []);

  const reset = useCallback((time = initialSeconds) => {
    setTimeLeft(time);
    timeLeftRef.current = time;
    setIsActive(false);
  }, [initialSeconds]);

  const addTime = useCallback((seconds) => {
    setTimeLeft((prev) => {
      const next = Math.max(0, prev + seconds);
      timeLeftRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    // Clear any leftover interval first
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (isActive) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            timerRef.current = null;
            setIsActive(false);
            timeLeftRef.current = 0;
            return 0;
          }
          timeLeftRef.current = prev - 1;
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isActive]);

  return { timeLeft, start, pause, resume, reset, addTime, isActive };
}

