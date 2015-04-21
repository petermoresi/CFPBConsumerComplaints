// A little dc-js magic to analyze the CFPB Consumer Complaints
var data,
    facts,
    companyDim,
    companyResponseDim,
    disputedDim,
    receivedDim,
    sentDim,
    issueDim,
    subIssueDim,
    productDim,
    subProductDim,
    stateDim,
    submitViaDim,
    timelyDim,
    zipcodeDim,
    monthDim,
    yearDim,
    yearMonthDim;

var minDate, minYear, maxDate, maxYear;

var recieveGroup,
    companyGroup,
    companyResponseGroup,
    productGroup,
    issueGroup,
    disputedGroup,
    yearGroup,
    yearMonthGroup,
    stateGroup,
    monthGroup;


var complaintCountChart,
    complaintMapChart,
    companyResponseChart,
    complaintsByProductChart,
    complaintsBySubProductChart,
    complaintsByIssueChart,
    complaintsBySubIssueChart,
    complaintsByCompanyChart,
    complaintsByMonthChart,
    complaintsByDisputedChart;
    

var monthNames = ["January", "February", "March", "April", "May", "June","July", "August", "September", "October", "November", "December"];


function pad(num, size, char) {
    var s = num+"";
    if (typeof char === 'undefined') { char = "0"; }
    while (s.length < size) s = char + s;
    return s;
}

d3.csv("https://data.consumerfinance.gov/api/views/x94z-ydhh/rows.csv?accessType=DOWNLOAD", function(result) {
    data = result;
    LoadEvents();
    LoadModel();
    LoadCharts();
})

var filterToggle = true;

function reset() {
    
    filterToggle = true;
    d3.selectAll('input[type="checkbox"]'). property("checked", false);
    companyDim.filter();
    dc.filterAll();
    dc.redrawAll();
    
}



// Add a toggle to auto scale Y axis on line chart
var autoScale = true;
function toggleAutoScale() {
    autoScale = !autoScale;

    complaintCountChart.elasticY(autoScale);
    complaintCountChart.redraw();

    complaintsByMonthChart.elasticY(autoScale);
    complaintsByMonthChart.redraw();
    
    complaintsByProductChart.elasticX(autoScale);
    complaintsByProductChart.redraw();

    complaintsByIssueChart.elasticX(autoScale);
    complaintsByIssueChart.redraw();

    companyResponseChart.elasticX(autoScale);
    companyResponseChart.redraw();
}


function LoadEvents() {

    d3.selectAll('input[name="filter-companies"]')
	.on('click', function() {
	    if (this.value === "pnmac") {
		complaintsByCompanyChart.filter(['PennyMac Loan Services, LLC']);
	    } else {
		complaintsByCompanyChart.filterAll();
	    }
	    dc.redrawAll();
	});

    d3.selectAll('input[name="filter-products"]')
	.on('click', function() {
	    if (this.value === "all") {
		complaintsByProductChart.filterAll();
	    } else {
		complaintsByProductChart.filter([this.value]);
	    }
	    dc.redrawAll();
	});

    
    d3.selectAll('input[name="complaint-volume-level"]')
	.on('click', function() {
	    switch(this.value) {
	    case "year":
		complaintCountChart
		    .dimension(yearDim)
		    .group(yearGroup);
		break;
	    case "month":
		complaintCountChart
		    .dimension(yearMonthDim)
		    .group(yearMonthGroup);
		break;
	    case "day":
		complaintCountChart
		    .dimension(receivedDim)
		    .group(recieveGroup)
		    .x(d3.time.scale().domain([minDate,maxDate]))
		break;
	    }
	    
	    complaintCountChart.redraw();
	    
	});
}

// Initialize the dimensions used for filtering the complaints
function LoadModel() {

    // Pre-process the 
    data.forEach(function(row) {
	row.received = new Date(row["Date received"]);
	row.sent = new Date(row["Date sent to company"]);
	row["Sub-issue"] = row["Sub-issue"] === "" ? "Not specified" : row["Sub-issue"];
    });
    
    facts = crossfilter(data);
    
    companyDim = facts.dimension(dc.pluck('Company'));
    companyResponseDim = facts.dimension(dc.pluck('Company response'));
    disputedDim = facts.dimension(dc.pluck("Consumer disputed?"));

    receivedDim = facts.dimension(dc.pluck("received"));
    
    monthDim = facts.dimension(function (d) {
        return (d.received.getMonth() + 1).toString();
    });

    yearDim = facts.dimension(function (d) {
        return new Date(d.received.getFullYear(), 1, 1 );
    });

    yearMonthDim = facts.dimension(function (d) {
        return new Date(d.received.getFullYear(), d.received.getMonth(), 1 );
    });

    stateDim = facts.dimension(dc.pluck("State"));
    
    issueDim = facts.dimension(dc.pluck("Issue"));
    subIssueDim = facts.dimension(dc.pluck("Sub-issue"));
    productDim = facts.dimension(dc.pluck("Product"));
    subProductDim = facts.dimension(dc.pluck("Sub-product"));
    timelyDim = facts.dimension(dc.pluck("Timely response?"));

    minDate = receivedDim.bottom(1)[0].received;
    minYear = minDate.getFullYear();
    maxDate = receivedDim.top(1)[0].received;
    maxYear = maxDate.getFullYear();

    recieveGroup		= receivedDim.group();
    companyResponseGroup	= companyResponseDim.group();
    productGroup		= productDim.group();
    subProductGroup		= subProductDim.group();
    issueGroup			= issueDim.group();
    subIssueGroup		= subIssueDim.group();
    companyGroup		= companyDim.group();    
    yearGroup			= yearDim.group();
    yearMonthGroup		= yearMonthDim.group();
    monthGroup			= monthDim.group();
    disputedGroup		= disputedDim.group();
    stateGroup                  = stateDim.group();

    return facts;
}


// load the charts into some spiffy looking charts
function LoadCharts() {


    // Show Complaint Volume (Default to by month)
    complaintCountChart = dc.lineChart("#chart-complaint-volume")
	.dimension(yearMonthDim)
	.group(yearMonthGroup)
	.x(d3.time.scale().domain([minDate,maxDate]))
	.elasticY(autoScale)
    	.elasticX(autoScale)
	.renderArea(true)
        .margins({top: 10, right: 50, bottom: 30, left: 50})
	.brushOn(false)
	.width(990)
	.height(400);
    
    complaintCountChart
	.xAxis()
	.ticks(maxYear - minYear);

    complaintCountChart.yAxis().ticks(5);


    companyResponseChart = dc.rowChart("#chart-company-response")
	.dimension(companyResponseDim)
	.group(companyResponseGroup)
	.data(function (group) {
	    return group.top(10);
	})
    	.elasticX(autoScale)
	.width(310)
	.height(40*7)
    	.xAxis().ticks(5);
    

    
    complaintsByProductChart = dc.rowChart('#chart-by-product');

    complaintsByProductChart.dimension(productDim)
	.group(productGroup)
	.width(310)
	.height(40*7)
	.elasticX(autoScale)
	.data(function (group) {
	    return group.top(7);
	})
	.ordering(function(d) { return -d.value })
        .xAxis().ticks(3);

    complaintsByProductChart.filter(['Mortgage']);
    
    complaintsBySubProductChart = dc.rowChart('#chart-by-sub-product');

    complaintsBySubProductChart.dimension(subProductDim)
	.group(subProductGroup)
	.width(310)
	.height(40*7)
	.elasticX(autoScale)
	.data(function (group) {
	    return group.top(7);
	})
	.ordering(function(d) { return -d.value })
        .xAxis().ticks(3);


    
    complaintsByIssueChart = dc.rowChart('#chart-by-issue');

    complaintsByIssueChart.dimension(issueDim)
	.group(issueGroup)
	.width(310)
	.height(40*7)
	.elasticX(autoScale)
	.data(function (group) {
	    return group.top(7);
	})
	.ordering(function(d) { return -d.value })
        .xAxis().ticks(3);

    complaintsBySubIssueChart = dc.rowChart('#chart-by-sub-issue');
    
    complaintsBySubIssueChart.dimension(subIssueDim)
	.group(subIssueGroup)
	.width(310)
	.height(40*7)
	.elasticX(autoScale)
	.data(function (group) {
	    return group.top(7);
	})
	.ordering(function(d) { return -d.value })
        .xAxis().ticks(3);

    
    complaintsByCompanyChart = dc.rowChart('#row-chart-count-by-company');

    complaintsByCompanyChart
	.dimension(companyDim)
	.group(companyGroup)
	.width(310)
	.height(350 * 3)
	.elasticX(autoScale)
	.data(function (group) {
	    return group.top(50);
	})	.ordering(function(d) { return -d.value })
        .xAxis().ticks(3);
    
    complaintsByCompanyChart.filter(['PennyMac Loan Services, LLC']);

    complaintsByMonthChart = dc.barChart('#chart-by-month');
    complaintsByMonthChart
	.dimension(monthDim)
	.group(monthGroup)
	.elasticY(autoScale)
	.x(d3.scale.linear().domain([1,12]))
	.width(310)
	.height(20*7);
    
    complaintsByDisputedChart = dc.pieChart('#chart-by-disputed')
	.dimension(disputedDim)
	.group(disputedGroup)
	.width(310)
	.height(20*7);

    
    complaintMapChart = dc.geoChoroplethChart("#chart-by-state");

    d3.json("data/us-states.json", function (statesJson) {
	complaintMapChart.width(990)
            .height(500)
            .dimension(stateDim)
            .group(stateGroup)
	    .valueAccessor(function(d){
		// convert to percentage of total
		return 100 * (d.value / receivedDim.top(Number.POSITIVE_INFINITY).length); 
	    }) 
            .colors(d3.scale.quantize().range(["#E2F2FF", "#C4E4FF", "#9ED2FF", "#81C5FF", "#6BBAFF", "#51AEFF", "#36A2FF", "#1E96FF", "#0089FF", "#0061B5"]
					     ))
            .colorDomain( [0, 10] )
            .colorCalculator(function (d) { return d ? complaintMapChart.colors()(d) : '#ccc'; })
            .overlayGeoJson(statesJson.features, "state", function (d) {
                return d.properties.name;
            })
            .title(function (d) {
                return "State: " + d.key + "\nPercentage: " + (d.value ? d.value.toFixed(1) : 0)  + "%";
            });

	dc.renderAll();
	
	d3.select("#loading").style("display", "none");
    });
}
