import React, { useState, useEffect } from 'react';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Area, ReferenceLine } from 'recharts';
import { defaultGoogleData } from './data/defaultGoogleData';
import { defaultLevantaData } from './data/defaultLevantaData';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";


function App() {
  const [mergedData, setMergedData] = useState([]);
  const [rollingAverageData, setRollingAverageData] = useState([]);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null); 
  const [dataDateRange, setDataDateRange] = useState({ start: null, end: null });

  // Add this with other utility functions (around line 15)
const getDataRange = (data, keys) => {
  const allValues = data.flatMap(item => 
    keys.map(key => item[key])
  ).filter(val => val !== undefined);
  
  return {
    min: Math.min(...allValues),
    max: Math.max(...allValues)
  };
};

  const calculateMovingAverage = (data, key, window = 7) => {
    return data.map((point, index) => {
      // Get window of points centered on current point
      const start = Math.max(0, index - Math.floor(window/2));
      const end = Math.min(data.length, index + Math.floor(window/2) + 1);
      const windowData = data.slice(start, end);
      
      // Calculate average for window
      const average = windowData.reduce((sum, p) => sum + p[key], 0) / windowData.length;
      
      return {
        date: point.date,
        trendline: average
      };
    });
  };
  
  const processGoogleAdsData = (text) => {
    const rows = text.split('\n').filter(row => row.trim());
    const data = rows.slice(3).map(row => {
      const [date, convValue, , cost] = row.split(',');
      return {
        date: date.replace(/"/g, ''),
        googleConvValue: parseFloat(convValue),
        cost: parseFloat(cost)
      };
    });
    return data;
  };

  const processLevantaData = (text) => {
    const rows = text.split('\n').filter(row => row.trim());
    const data = rows.slice(1).map(row => {
      const matches = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
      if (!matches) return null;
      
      const values = matches.map(val => val.replace(/"/g, ''));
      const commission = values[6];
      
      if (!commission) {
        console.error('Missing commission value for row:', row);
        return null;
      }

      const cleanCommission = commission.replace(/[$,]/g, '');
      const commissionValue = parseFloat(cleanCommission);

      if (isNaN(commissionValue)) {
        console.error('Invalid commission value:', commission);
        return null;
      }

      return {
        date: values[0],
        levantaConvValue: commissionValue
      };
    }).filter(item => item !== null);

    return data;
  };

  const formatDate = (dateStr) => {
    try {
      let date;
      if (dateStr.includes('/')) {
        const [month, day, year] = dateStr.split('/');
        date = new Date(year, month - 1, day);
      } else {
        const [year, month, day] = dateStr.split('-');
        date = new Date(year, month - 1, day);
      }
      return date.toISOString().split('T')[0];
    } catch (e) {
      console.error('Date parsing error:', e);
      return null;
    }
  };

  const mergeData = (googleData, levantaData) => {
    const googleMap = new Map(
      googleData.map(item => [
        formatDate(item.date),
        item
      ])
    );

    const levantaMap = new Map(
      levantaData.map(item => [
        formatDate(item.date),
        item
      ])
    );

    const merged = [];
    for (const [date, googleItem] of googleMap) {
      const levantaItem = levantaMap.get(date);
      if (levantaItem) {
        merged.push({
          date,
          googleConvValue: googleItem.googleConvValue,
          levantaConvValue: levantaItem.levantaConvValue,
          cost: googleItem.cost,
          googleRoas: parseFloat((googleItem.googleConvValue / googleItem.cost).toFixed(2)),
          levantaRoas: parseFloat((levantaItem.levantaConvValue / googleItem.cost).toFixed(2))
        });
      }
    }

    const sortedData = merged.sort((a, b) => a.date.localeCompare(b.date));
    const averagedData = calculateRollingAverages(sortedData);
    setRollingAverageData(averagedData);
    return sortedData;
  };

  const calculateRollingAverages = (data) => {
    return data.map((_, index, array) => {
      const start = Math.max(0, index - 6);
      const window = array.slice(start, index + 1);
      
      const avgGoogleRoas = window.reduce((sum, item) => sum + item.googleRoas, 0) / window.length;
      const avgLevantaRoas = window.reduce((sum, item) => sum + item.levantaRoas, 0) / window.length;
      const avgCost = window.reduce((sum, item) => sum + item.cost, 0) / window.length;

      return {
        ...array[index],
        googleRoasAvg: parseFloat(avgGoogleRoas.toFixed(2)),
        levantaRoasAvg: parseFloat(avgLevantaRoas.toFixed(2)),
        costAvg: parseFloat(avgCost.toFixed(2))
      };
    });
  };

// Calculate the difference in ROAS
const differenceRoasData = mergedData.map((row) => ({
  date: row.date,
  differenceRoas: row.levantaRoas - row.googleRoas,
}));

// Calculate the rolling 7-day average of the difference in ROAS
const rollingDifferenceRoasData = differenceRoasData.map((row, index, arr) => {
  const start = Math.max(0, index - 6);
  const slice = arr.slice(start, index + 1);
  const total = slice.reduce((sum, item) => sum + item.differenceRoas, 0);
  return {
    date: row.date,
    rollingDifferenceRoasAvg: total / slice.length,
  };
});

// Add these calculations where other data processing happens
const roasRatioData = mergedData.map((row) => ({
  date: row.date,
  roasRatio: row.googleRoas === 0 ? 0 : row.levantaRoas / row.googleRoas,
  cost: row.cost
}));

// Calculate rolling average
const rollingRoasRatioData = roasRatioData.map((row, index, arr) => {
  const start = Math.max(0, index - 6);
  const slice = arr.slice(start, index + 1);
  const totalRatio = slice.reduce((sum, item) => sum + item.roasRatio, 0);
  const totalCost = slice.reduce((sum, item) => sum + item.cost, 0) / slice.length;
  return {
    date: row.date,
    rollingRoasRatioAvg: totalRatio / slice.length,
    costAvg: totalCost
  };
});

  useEffect(() => {
    try {
      const storedGoogleAdsData = localStorage.getItem('googleAdsData');
      const storedLevantaData = localStorage.getItem('levantaData');

      let googleAdsData, levantaData;

      if (storedGoogleAdsData && storedLevantaData) {
        googleAdsData = JSON.parse(storedGoogleAdsData);
        levantaData = JSON.parse(storedLevantaData);
      } else {
        googleAdsData = processGoogleAdsData(defaultGoogleData);
        levantaData = processLevantaData(defaultLevantaData);
      }

      const merged = mergeData(googleAdsData, levantaData);
      setMergedData(merged);
    } catch (err) {
      setError('Error processing default data: ' + err.message);
    }
  }, []); // Empty dependency array means this runs once on mount

  // Add this after mergedData is set (in the useEffect or where data is merged)
useEffect(() => {
  if (mergedData.length > 0) {
    const dates = mergedData.map(d => new Date(d.date));
    setDataDateRange({
      start: new Date(Math.min(...dates)).toISOString().split('T')[0],
      end: new Date(Math.max(...dates)).toISOString().split('T')[0]
    });
  }
}, [mergedData]);


  const handleFileUpload = async (e) => {
    try {
      setError('');
      const files = Array.from(e.target.files);
      if (files.length !== 2) {
        setError('Please upload exactly two files');
        return;
      }

      const fileContents = await Promise.all(
        files.map(file => file.text())
      );

      let googleAdsData, levantaData;

      fileContents.forEach(content => {
        if (content.includes('Conv. value,Currency code,Cost')) {
          googleAdsData = processGoogleAdsData(content);
        } else if (content.includes('Clicks,DPVs,AddToCart')) {
          levantaData = processLevantaData(content);
        }
      });

      if (!googleAdsData || !levantaData) {
        setError('Please upload both Google Ads and Levanta data files in the correct format');
        return;
      }

      const merged = mergeData(googleAdsData, levantaData);
      setMergedData(merged);

      // Save new data to local storage
      localStorage.setItem('googleAdsData', JSON.stringify(googleAdsData));
      localStorage.setItem('levantaData', JSON.stringify(levantaData));
    } catch (err) {
      setError('Error processing files: ' + err.message);
    }
  };

    // Add filtering functions
  // Filtering functions for each data source
  const getFilteredMergedData = () => {
    if (!startDate || !endDate) return mergedData;
    return mergedData.filter(row => {
      const rowDate = new Date(row.date);
      return rowDate >= startDate && rowDate <= endDate;
    });
  };

  const getFilteredRollingAverageData = () => {
    if (!startDate || !endDate) return rollingAverageData;
    return rollingAverageData.filter(row => {
      const rowDate = new Date(row.date);
      return rowDate >= startDate && rowDate <= endDate;
    });
  };

  const getFilteredDifferenceRoasData = () => {
    if (!startDate || !endDate) return differenceRoasData;
    return differenceRoasData.filter(row => {
      const rowDate = new Date(row.date);
      return rowDate >= startDate && rowDate <= endDate;
    });
  };

  const getFilteredRoasRatioData = () => {
    if (!startDate || !endDate) return roasRatioData;
    return roasRatioData.filter(row => {
      const rowDate = new Date(row.date);
      return rowDate >= startDate && rowDate <= endDate;
    });
  };

  // Store filtered data at render start
  const filteredMergedData = getFilteredMergedData();
  const filteredRollingAverageData = getFilteredRollingAverageData();
  const filteredDifferenceRoasData = getFilteredDifferenceRoasData();
  const filteredRoasRatioData = getFilteredRoasRatioData();
  const differenceTrendlineData = calculateMovingAverage(filteredDifferenceRoasData, 'differenceRoas');
  const roasRatioDataTrendData = calculateMovingAverage(filteredRoasRatioData, 'roasRatio');

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">ROAS Analysis Dashboard</h2>

              
          <div className="space-y-6">
            <div>
              <input
                type="file"
                multiple
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
             
              <button
                onClick={() => document.getElementById('file-upload').click()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Upload New CSV Files
              </button>
              
              <p className="mt-2 text-sm text-gray-500 text-center">
                Using default data. Upload new files to override.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

                            {/* Add Date Pickers here */}
      <div className="mb-6">
        <div className="flex gap-4 items-center mb-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <DatePicker
              selected={startDate}
              onChange={date => setStartDate(date)}
              selectsStart
              startDate={startDate}
              endDate={endDate}
              className="px-3 py-2 border border-gray-300 rounded-md"
              dateFormat="yyyy-MM-dd"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <DatePicker
              selected={endDate}
              onChange={date => setEndDate(date)}
              selectsEnd
              startDate={startDate}
              endDate={endDate}
              minDate={startDate}
              className="px-3 py-2 border border-gray-300 rounded-md"
              dateFormat="yyyy-MM-dd"
            />
          </div>
        </div>
        {dataDateRange.start && (
          <p className="text-sm text-gray-600">
            Available data range: {dataDateRange.start} to {dataDateRange.end}
          </p>
        )}
      </div>  


            {mergedData.length > 0 && (
              <>
                <div className="space-y-6">
                  <div className="w-full h-[400px] bg-white p-4 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold mb-4">Daily Values</h3>
                    <ComposedChart width={1000} height={350} data={filteredMergedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" orientation="left" ticks={[0, 1.0]} />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Area
                        yAxisId="right"
                        type="monotone"
                        dataKey="cost"
                        name="Cost"
                        fill="rgba(229, 231, 235, 0.8)"
                        stroke="#9CA3AF"
                      />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="googleRoas" 
                        stroke="#4F46E5" 
                        name="Google Ads ROAS"
                        dot={{ r: 3 }}
                      />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="levantaRoas" 
                        stroke="#10B981" 
                        name="Levanta ROAS"
                        dot={{ r: 3 }}
                      />
                      <ReferenceLine y={1.0} yAxisId="left" stroke="red" strokeDasharray="3 3" />
                    </ComposedChart>
                  </div>

                  <div className="w-full h-[400px] bg-white p-4 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold mb-4">7-Day Rolling Average</h3>
                    <ComposedChart width={1000} height={350} data={filteredRollingAverageData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" orientation="left" ticks={[0, 1.0]} />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Area
                        yAxisId="right"
                        type="monotone"
                        dataKey="costAvg"
                        name="Cost (7-day avg)"
                        fill="rgba(229, 231, 235, 0.8)"
                        stroke="#9CA3AF"
                      />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="googleRoasAvg" 
                        stroke="#4F46E5" 
                        name="Google Ads ROAS (7-day avg)"
                        dot={{ r: 3 }}
                      />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="levantaRoasAvg" 
                        stroke="#10B981" 
                        name="Levanta ROAS (7-day avg)"
                        dot={{ r: 3 }}
                      />
                      <ReferenceLine y={1.0} yAxisId="left" stroke="red" strokeDasharray="3 3" />
                    </ComposedChart>
                  </div>

{/* Difference in ROAS Chart */}
<div className="w-full h-[400px] bg-white p-4 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold mb-4">Difference in ROAS (Levanta - Google)</h3>
                    <ComposedChart width={1000} height={350} data={filteredDifferenceRoasData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis 
                        yAxisId="left" 
                        orientation="left"
                        domain={[
                          dataMin => -0.5,
                          dataMax => 1.5
                        ]}
                      />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="differenceRoas" 
                        stroke="#4F46E5" 
                        name="Difference in ROAS"
                        dot={{ r: 3 }}
                      />
                      <Line 
                        yAxisId="left"
                        type="monotone"
                        dataKey="trendline"
                        stroke="#FF8C00"
                        name="Trendline"
                        dot={false}
                        strokeDasharray="5 5"
                        data={differenceTrendlineData}
                      />
                      <ReferenceLine y={0.0} yAxisId="left" stroke="red" strokeDasharray="3 3" />
                    </ComposedChart>
                  </div>

{/* ROAS Ratio Chart */}
<div className="w-full h-[400px] bg-white p-4 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold mb-4">ROAS Ratio (Levanta/Google)</h3>
                    <ComposedChart width={1000} height={350} data={filteredRoasRatioData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis 
                        yAxisId="left" 
                        orientation="left"
                        domain={[
                          dataMin => Math.floor(Math.min(dataMin, getDataRange(filteredRoasRatioData, ['differenceRoas']).min)),
                          dataMax => Math.ceil(Math.max(dataMax, getDataRange(filteredRoasRatioData, ['differenceRoas']).max))
                        ]}
                      />
\
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="roasRatio" 
                        stroke="#4F46E5" 
                        name="ROAS Ratio"
                        dot={{ r: 3 }}
                      />
                      <Line 
                        yAxisId="left"
                        type="monotone"
                        dataKey="trendline"
                        stroke="#FF8C00"
                        name="Trendline"
                        dot={false}
                        strokeDasharray="5 5"
                        data={roasRatioDataTrendData}
                      />
                      <ReferenceLine y={1.0} yAxisId="left" stroke="red" strokeDasharray="3 3" />


                    </ComposedChart>
                  </div>

                </div>
                <br></br>
                <br></br>


<div className="overflow-x-auto rounded-lg border border-gray-200 shadow-md">
  <table className="min-w-full divide-y divide-gray-200">
    <thead className="bg-gray-100 sticky top-0 shadow-sm">
      <tr>
        <th className="px-8 py-5 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">
          Date
        </th>
        <th className="px-8 py-5 text-right text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">
          Cost
        </th>
        <th className="px-8 py-5 text-right text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">
          Google Conv. Value
        </th>
        <th className="px-8 py-5 text-right text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">
          Levanta Conv. Value
        </th>
        <th className="px-8 py-5 text-right text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">
          Google ROAS
        </th>
        <th className="px-8 py-5 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
          Levanta ROAS
        </th>
      </tr>
    </thead>
    <tbody className="bg-white divide-y divide-gray-200">
      {[...filteredMergedData].reverse().map((row, index) => (
        <tr key={row.date} 
            className={`hover:bg-blue-50 transition-colors duration-150 ease-in-out
            ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
          <td className="px-8 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">
            {row.date}
          </td>
          <td className="px-8 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900 border-r border-gray-200">
            ${row.cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
          <td className="px-8 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900 border-r border-gray-200">
            ${row.googleConvValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
          <td className="px-8 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900 border-r border-gray-200">
            ${row.levantaConvValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
          <td className="px-8 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900 border-r border-gray-200">
            {parseFloat(row.googleRoas).toFixed(2)}
          </td>
          <td className="px-8 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
            {parseFloat(row.levantaRoas).toFixed(2)}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;