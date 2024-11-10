'use client';

import { FC } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Brain, Zap, Trophy, Clock, Calendar, TrendingUp, BarChart2 } from 'lucide-react';

// Dummy data for learning progress
const retentionData = [
  { date: 'Mon', retention: 75 },
  { date: 'Tue', retention: 82 },
  { date: 'Wed', retention: 78 },
  { date: 'Thu', retention: 85 },
  { date: 'Fri', retention: 89 },
  { date: 'Sat', retention: 92 },
  { date: 'Sun', retention: 88 },
];

const learningStats = {
  totalCards: 246,
  mastered: 158,
  needsReview: 48,
  todaysDue: 24,
  streakDays: 7,
  avgRetention: 87,
};

const upcomingReviews = [
  { day: 'Today', count: 24, difficulty: 'Easy' },
  { day: 'Tomorrow', count: 18, difficulty: 'Medium' },
  { day: 'Next Week', count: 45, difficulty: 'Hard' },
];

const SimpleChart: FC<{ data: typeof retentionData }> = ({ data }) => {
  const maxRetention = Math.max(...data.map(d => d.retention));
  const minRetention = Math.min(...data.map(d => d.retention));
  
  return (
    <div className="h-[300px] w-full flex items-end gap-2 pb-6 relative">
      {/* Y-axis labels */}
      <div className="absolute left-0 h-full flex flex-col justify-between text-xs text-gray-500 pr-2">
        <span>{maxRetention}%</span>
        <span>{Math.round((maxRetention + minRetention) / 2)}%</span>
        <span>{minRetention}%</span>
      </div>
      
      {/* Bars */}
      <div className="flex-1 flex items-end gap-2 pl-8">
        {data.map((item, index) => {
          const height = ((item.retention - minRetention) / (maxRetention - minRetention)) * 100;
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div 
                className="w-full bg-blue-500 rounded-t-sm transition-all duration-300 hover:bg-blue-600"
                style={{ height: `${height}%` }}
              />
              <span className="text-xs text-gray-500">{item.date}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ProgressPage: FC = () => {
  return (
    <div className="flex-1 p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Learning Progress</h1>
          <p className="text-gray-500 mt-1">Track your knowledge retention and study habits</p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Brain className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Cards</p>
                  <p className="text-2xl font-semibold">{learningStats.totalCards}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-50 rounded-lg">
                  <Trophy className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Mastered</p>
                  <p className="text-2xl font-semibold">{learningStats.mastered}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Due Today</p>
                  <p className="text-2xl font-semibold">{learningStats.todaysDue}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <Zap className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Day Streak</p>
                  <p className="text-2xl font-semibold">{learningStats.streakDays}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Retention Chart and Upcoming Reviews */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-gray-500" />
                Retention Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleChart data={retentionData} />
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-500" />
                Upcoming Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingReviews.map((review, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-700">{review.day}</p>
                      <p className="text-sm text-gray-500">{review.difficulty}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">{review.count}</span>
                      <span className="text-sm text-gray-500">cards</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Stats */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-gray-500" />
              Learning Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Average Retention Rate</p>
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-2xl font-semibold">{learningStats.avgRetention}%</span>
                  <span className="text-green-500 text-sm mb-1">↑ 2.3%</span>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Cards Needing Review</p>
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-2xl font-semibold">{learningStats.needsReview}</span>
                  <span className="text-sm text-gray-500 mb-1">cards</span>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Study Session Duration</p>
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-2xl font-semibold">32</span>
                  <span className="text-sm text-gray-500 mb-1">min avg</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};



export default ProgressPage;