/* global Module */

/* Magic Mirror
 * Module: MMM-NOAA-Forecast
 *
 * By Aaron Axvig https://github.com/aaronaxvig
 * MIT Licensed
 */

Module.register("MMM-NOAA-Forecast", {
	defaults: {
		point: {
			latitude: 46.0,
			longitude: -103.0
		},
		tempGraph: {
			height: 400,
			width: 600,
			hours: 15,
			verticalMultiplier: 200
		},
		apiBase: "https://api.weather.gov/",
		pointsApi: "points/",
		updateInterval: 10 * 60 * 1000, // 10 minutes
		fadeSpeed: 1000
	},

	start: function () {
		self = this;

		this.forecast = null;

		self.updateForecast();

		setInterval(function () {
			self.updateForecast();
		}, this.config.updateInterval);
	},

	getScripts: function () {
		return ["moment.js"];
	},

	getStyles: function () {
		return ["MMM-NOAA-Forecast.css"]
	},

	getDom: function () {
		var wrapper = document.createElement("div");

		var divStatus = document.createElement("div");
		divStatus.classList.add("xsmall");

		if (this.forecast !== null) {
			var divTempGraph = document.createElement("div");


			var divGraphBars = document.createElement("div");
			divGraphBars.classList.add("MMM-NOAA-Forecast-GraphBars");
			divGraphBars.style.width = this.config.tempGraph.width;
			divGraphBars.style.height = this.config.tempGraph.height;

			var maxTemp = Number.MIN_SAFE_INTEGER;
			var minTemp = Number.MAX_SAFE_INTEGER;
			for (var i = 0; (i < this.config.tempGraph.hours) && (i < this.forecast.properties.periods.length); i++) {
				if (this.forecast.properties.periods[i].temperature > maxTemp) {
					maxTemp = this.forecast.properties.periods[i].temperature;
				}
				if (this.forecast.properties.periods[i].temperature < minTemp) {
					minTemp = this.forecast.properties.periods[i].temperature;
				}
			}

			var tempRange = maxTemp - minTemp;

			for (var i = 0; (i < this.config.tempGraph.hours) && (i < this.forecast.properties.periods.length); i++) {
				var divGraphBar = document.createElement("div");
				divGraphBar.classList.add("MMM-NOAA-Forecast-GraphBar");

				var overMin = this.forecast.properties.periods[i].temperature - minTemp;
				var heightFraction = overMin * (1 / tempRange);
				divGraphBar.style.height = ((heightFraction * this.config.tempGraph.verticalMultiplier) + 100) + "px";

				var divGraphBarText = document.createElement("div");
				divGraphBarText.classList.add("MMM-NOAA-Forecast-GraphBarText");
				divGraphBarText.classList.add("xsmall");
				divGraphBarText.innerHTML = this.forecast.properties.periods[i].temperature + " - " + moment(this.forecast.properties.periods[i].startTime).format("hA");
				divGraphBar.appendChild(divGraphBarText);

				divGraphBars.appendChild(divGraphBar);
			}
			wrapper.appendChild(divGraphBars);

			divStatus.innerHTML = "Generated at " + moment(this.forecast.properties.generatedAt).format("LT");
		}
		else {
			divStatus.innerHTML = "No data to display."
		}

		wrapper.appendChild(divStatus);

		return wrapper;
	},

	updateForecast: function () {
		var self = this;
		var retry = true;

		// First call the point API to get the info for the given lat/long.
		var url = this.config.apiBase + this.config.pointsApi + this.config.point.latitude + "," + this.config.point.longitude;
		var pointRequest = new XMLHttpRequest();

		pointRequest.open("GET", url, true);
		pointRequest.onreadystatechange = function () {
			if (this.readyState === 4) {
				if (this.status === 200) {
					self.processPointResponse(JSON.parse(this.response));
				} else {
					Log.error(self.name + ": Could not load forecast.");
				}
			}
		};

		pointRequest.send();
	},

	processPointResponse: function (data) {
		// The point response contains the URL for the hourly forecast API.
		var url = data.properties.forecastHourly;
		var forecastRequest = new XMLHttpRequest();

		forecastRequest.open("GET", url, true);
		forecastRequest.onreadystatechange = function () {
			if (this.readyState === 4) {
				if (this.status === 200) {
					self.processForecastResponse(JSON.parse(this.response));
				} else {
					Log.error(self.name + ": Could not load forecast.");
				}
			}
		};

		forecastRequest.send();
	},

	processForecastResponse: function (data) {
		this.forecast = data;
		this.updateDom();
	},
});