interface MarineForecastProps {
  marine: {
    seas: string
    winds: string
    advisories: string[]
  }
}

export function MarineForecast({ marine }: MarineForecastProps) {
  return (
    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
      <h3 className="text-sm font-medium text-blue-900 mb-3 flex items-center gap-1.5">
        <span>🌊</span>
        Marine
      </h3>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-0.5">Seas</div>
          <div className="text-lg font-semibold text-gray-900">{marine.seas}</div>
        </div>
        
        <div className="bg-white rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-0.5">Winds</div>
          <div className="text-lg font-semibold text-gray-900">{marine.winds}</div>
        </div>
      </div>

      {marine.advisories && marine.advisories.length > 0 && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="font-medium text-yellow-800 mb-1 text-sm">⚠️ Advisories</div>
          <ul className="list-disc list-inside text-xs text-yellow-700 space-y-0.5">
            {marine.advisories.map((advisory, index) => (
              <li key={index}>{advisory}</li>
            ))}
          </ul>
        </div>
      )}

      {(!marine.advisories || marine.advisories.length === 0) && (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
          <div className="text-xs text-green-700 flex items-center gap-1.5">
            <span>✓</span>
            No advisories
          </div>
        </div>
      )}
    </div>
  )
}
