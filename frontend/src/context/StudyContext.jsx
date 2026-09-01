import React, { createContext, useContext, useState, useEffect } from "react";
import {
  listStudyTargets,
  getGlobalDailyTasks,
  addGlobalDailyTask,
  toggleStudyTask,
  editStudyTask,
  deleteStudyTarget,
  resetGlobalDailyTasks
} from "../api/client";
import { useAuth } from "./AuthContext";
import { getMe } from "../api/client";

const StudyContext = createContext();

export const useStudyData = () => useContext(StudyContext);

export const StudyProvider = ({ children }) => {
  const { user, setUser } = useAuth();
  const [studyTargets, setStudyTargets] = useState([]);
  const [dailyTasks, setDailyTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStudyData = async () => {
    if (!user) return;
    try {
      const [targetsRes, tasksRes] = await Promise.all([
        listStudyTargets(),
        getGlobalDailyTasks(),
      ]);
      setStudyTargets(targetsRes.data);
      setDailyTasks(tasksRes.data);
    } catch (e) {
      console.error("Error fetching study data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchStudyData();
    }
  }, [user]);

  const addTask = async (description) => {
    const tempId = "temp-" + Date.now();
    const tempTask = { id: tempId, description, is_completed: false, completion_note: null };
    setDailyTasks(prev => [tempTask, ...prev]);
    
    try {
        const res = await addGlobalDailyTask({ description });
        setDailyTasks(prev => prev.map(t => t.id === tempId ? res.data : t));
        return res.data;
    } catch(e) {
        setDailyTasks(prev => prev.filter(t => t.id !== tempId));
        throw e;
    }
  };

  const toggleTask = async (taskId) => {
    const task = dailyTasks.find(t => t.id === taskId);
    if (!task) return;
    const originalTasks = [...dailyTasks];
    const isNowCompleted = !task.is_completed;
    
    // Optimistic UI updates
    setDailyTasks(prev => prev.map(t => t.id === taskId ? { ...t, is_completed: isNowCompleted } : t));
    setUser(prev => {
        if (!prev) return prev;
        return {
            ...prev,
            reward_points: isNowCompleted ? (prev.reward_points + 10) : Math.max(0, prev.reward_points - 10)
        };
    });

    try {
        const res = await toggleStudyTask(taskId);
        setDailyTasks(prev => prev.map(t => t.id === taskId ? res.data : t));
    } catch (e) {
        // Revert on error
        setDailyTasks(originalTasks);
    }
  };
  
  const editTask = async (taskId, data) => {
    const originalTasks = [...dailyTasks];
    setDailyTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...data } : t));
    try {
        const res = await editStudyTask(taskId, data);
        setDailyTasks(prev => prev.map(t => t.id === taskId ? res.data : t));
        return res.data;
    } catch (e) {
        setDailyTasks(originalTasks);
        throw e;
    }
  };
  
  const clearDailyTasks = async () => {
    await resetGlobalDailyTasks();
    setDailyTasks([]);
  };
  
  const refreshTasks = () => fetchStudyData();

  return (
    <StudyContext.Provider
      value={{
        studyTargets,
        dailyTasks,
        loading,
        fetchStudyData,
        addTask,
        toggleTask,
        editTask,
        clearDailyTasks,
        refreshTasks
      }}
    >
      {children}
    </StudyContext.Provider>
  );
};
