import React, { createContext, useContext, useState, useEffect } from "react";
import {
  listStudyTargets,
  getGlobalDailyTasks,
  addGlobalDailyTask,
  toggleStudyTask,
  deleteStudyTarget,
  resetGlobalDailyTasks
} from "../api/client";
import { useAuth } from "./AuthContext";

const StudyContext = createContext();

export const useStudyData = () => useContext(StudyContext);

export const StudyProvider = ({ children }) => {
  const { user } = useAuth();
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
    const res = await addGlobalDailyTask({ description });
    setDailyTasks(prev => [res.data, ...prev]);
    return res.data;
  };

  const toggleTask = async (taskId) => {
    const res = await toggleStudyTask(taskId);
    setDailyTasks(prev => prev.map(t => t.id === taskId ? res.data : t));
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
        clearDailyTasks,
        refreshTasks
      }}
    >
      {children}
    </StudyContext.Provider>
  );
};
