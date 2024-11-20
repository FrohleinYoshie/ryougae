import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

interface DenominationCount {
  [key: number]: number;
}

interface ExchangeResult {
  from: DenominationCount;
  to: DenominationCount;
  totalCurrent: number;
  totalTarget: number;
}

const denominations = [10000, 5000, 1000, 500, 100, 50, 10, 5, 1];

const App: React.FC = () => {
  const [currentMoney, setCurrentMoney] = useState<DenominationCount>(
    Object.fromEntries(denominations.map(d => [d, 0]))
  );
  const [targetAmounts, setTargetAmounts] = useState<number[]>([0]);
  const [result, setResult] = useState<ExchangeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | 'target'>('current');

  useEffect(() => {
    calculateExchange();
  }, [currentMoney, targetAmounts]);

  const handleCurrentMoneyChange = (denomination: number, value: string) => {
    const numValue = value === '' ? 0 : parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      setCurrentMoney(prev => ({ ...prev, [denomination]: numValue }));
    }
  };

  const handleTargetAmountChange = (index: number, value: string) => {
    const numValue = value === '' ? 0 : parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      setTargetAmounts(prev => {
        const newAmounts = [...prev];
        newAmounts[index] = numValue;
        return newAmounts;
      });
    }
  };

  const addTargetAmountField = () => {
    setTargetAmounts(prev => [...prev, 0]);
  };

  const removeTargetAmountField = (index: number) => {
    setTargetAmounts(prev => prev.filter((_, i) => i !== index));
  };

  const calculateExchange = async () => {
    try {
      const response = await axios.post<ExchangeResult>('http://localhost:8080/calculate-exchange', {
        currentMoney,
        targetAmounts: targetAmounts.filter(amount => amount > 0)
      });
      setResult(response.data);
      setError(null);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setError(`計算エラー: ${err.response.data}`);
      } else {
        setError('計算中に予期せぬエラーが発生しました。');
      }
      setResult(null);
    }
  };

  const renderDenominationCount = (counts: DenominationCount) => {
    return (
      <div className="denomination-count">
        {denominations.map(denom => (
          counts[denom] > 0 && (
            <div key={denom} className="denomination-item">
              <span className="denomination-value">{denom}円</span>
              <span className="denomination-count">{counts[denom]}枚</span>
            </div>
          )
        ))}
      </div>
    );
  };

  const getDenominationLabel = (denomination: number) => {
    if (denomination >= 1000) {
      return `${denomination}円札`;
    } else {
      return `${denomination}円硬貨`;
    }
  };

  return (
    <div className="app-container">
      <h1 className="app-title">両替計算機</h1>
      
      <div className="tab-container">
        <button 
          className={`tab-button ${activeTab === 'current' ? 'active' : ''}`}
          onClick={() => setActiveTab('current')}
        >
          現在の金額
        </button>
        <button 
          className={`tab-button ${activeTab === 'target' ? 'active' : ''}`}
          onClick={() => setActiveTab('target')}
        >
          両替したい金額
        </button>
      </div>

      <div className="input-container">
        <div className={`input-section ${activeTab === 'current' ? 'active' : ''}`}>
          <h2>現在の金額（枚数を入力）</h2>
          <p className="input-description">各金種の枚数を入力してください。</p>
          <div className="denomination-inputs">
            {denominations.map(denomination => (
              <div key={denomination} className="denomination-input">
                <label>{getDenominationLabel(denomination)}:</label>
                <div className="input-with-unit">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    value={currentMoney[denomination] || ''}
                    onChange={(e) => handleCurrentMoneyChange(denomination, e.target.value)}
                    placeholder="0"
                  />
                  <span className="input-unit">枚</span>
                </div>
              </div>
            ))}
          </div>
          <p className="total-amount">合計: {result?.totalCurrent.toLocaleString() ?? 0}円</p>
        </div>

        <div className={`input-section ${activeTab === 'target' ? 'active' : ''}`}>
          <h2>両替したい金額</h2>
          <div className="target-amount-inputs">
            {targetAmounts.map((amount, index) => (
              <div key={index} className="target-amount-input">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  value={amount || ''}
                  onChange={(e) => handleTargetAmountChange(index, e.target.value)}
                  placeholder="金額を入力"
                />
                {index > 0 && (
                  <button onClick={() => removeTargetAmountField(index)} className="remove-button">
                    削除
                  </button>
                )}
              </div>
            ))}
            <button onClick={addTargetAmountField} className="add-button">
              金額を追加
            </button>
          </div>
          <p className="total-amount">合計: {result?.totalTarget.toLocaleString() ?? 0}円</p>
        </div>
      </div>

      {error && <p className="error-message">{error}</p>}

      {result && (
        <div className="result-section">
          <h2>計算結果</h2>
          <div className="result-content">
            <div className="result-column">
              <h3>元の金額:</h3>
              {renderDenominationCount(result.from)}
            </div>
            <div className="result-column">
              <h3>両替後の金額:</h3>
              {renderDenominationCount(result.to)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;