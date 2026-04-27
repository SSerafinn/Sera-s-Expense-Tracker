import Chart from 'chart.js/auto';

let expenseChartInstance = null;
let insightsBarInstance = null;

const colors = [
  '#37534D', '#A3B19B', '#B58D8D', '#C8A97E', '#677E79', '#E0DEDA', '#5A6258'
];

export function updateChart(transactions) {
  const canvas = document.getElementById('expense-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const categoryTotals = transactions.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {});

  const data = {
    labels: Object.keys(categoryTotals).map(c => c.charAt(0).toUpperCase() + c.slice(1)),
    datasets: [{
      data: Object.values(categoryTotals),
      backgroundColor: colors,
      borderWidth: 0,
      hoverOffset: 4
    }]
  };

  if (expenseChartInstance) {
    expenseChartInstance.data = data;
    expenseChartInstance.update();
  } else {
    expenseChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: { position: 'right', labels: { usePointStyle: true } }
        }
      }
    });
  }
}

export function updateInsightsChart(totalIncome, totalExpenses) {
  const canvas = document.getElementById('insights-bar-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const data = {
    labels: ['Cash Flow'],
    datasets: [
      {
        label: 'Income',
        data: [totalIncome],
        backgroundColor: '#A3B19B',
        borderRadius: 4
      },
      {
        label: 'Expenses',
        data: [totalExpenses],
        backgroundColor: '#8C4040',
        borderRadius: 4
      }
    ]
  };

  if (insightsBarInstance) {
    insightsBarInstance.data = data;
    insightsBarInstance.update();
  } else {
    insightsBarInstance = new Chart(ctx, {
      type: 'bar',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true }
        },
        plugins: {
          legend: { position: 'top' }
        }
      }
    });
  }
}
