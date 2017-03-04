jQuery.fn.stat = function (options) {
	var settings = jQuery.extend({
		total: '.total',
		title: 'h1.section-title',
		content: 'div.content',
		files: 'tbody:not(.remove) tr',
		stat: 'td.stat',
		completed: '●',
		index: 0,
		openAll: true,
		speed: 'fast'
	}, options),
	all_sections = this;
	return this.each(function(){
		var self = this,
			$self = $(self),
			title_text = [],
			completed = 0;
		self.section_title = $(settings.title, $self);
		self.content = $(settings.content, $self);
		self.files = $(settings.files, $self);
		self.files.each(function(){
			var stat = $(settings.stat, this);
			stat.each(function(){
				var text = $(this).text();
				if (text && (text === settings.completed)) {
					completed++;
				}
			});
		});
		title_text = [self.section_title.text(), ' (',completed,'/',self.files.length,')',' ',': 진행율 ',Math.round(completed/self.files.length*100),'%',];
		self.section_title.text(title_text.join(''));
		self.section_title.on('click', function(){
			self.content.slideToggle();
		});

		//total
		var completedAll = 0;
		$(settings.stat).each(function(){
			var text = $(this).text();
			if (text && (text == settings.completed)) {
				completedAll++;
			}
		});
		$(settings.total).text('Total : '+completedAll+'/'+$(settings.files).length+'pages (전체 진행율 '+Math.round(completedAll/$(settings.files).length*100)+'%)');
	});
};

;$(function(){
	$('section').stat();

	//over-coloring
	$('section tbody tr').mouseover(function() {
		$(this).addClass('overcoloring');
	}).mouseout(function() {
		$(this).removeClass('overcoloring');
	});
	autoLink();
});

var autoLink = function(){
	jQuery.each($('section'), function(i){
		var lan = $(this).find('tbody tr');
	//	var path = '/polyschool/web';
		var path3 = $(this).find('tbody tr').eq(0).find('.path').text();
		jQuery.each(lan, function(j){
			if ($(this).find('.stat').text() == '●' || $(this).find('.stat').text() == '○'){
				if ($(this).find('.file a').hasClass('manual')) return;
				var defPath = path3,
					currentPath = $(this).find('.path').text();
				if (currentPath == '/' || currentPath == '') {
					path3 = defPath;
				} else {
					path3 = './' + currentPath + '/';
				}
				$(this).find('.file a').attr({
					'href' : path3 + $(this).find('.file a').text() + '.html',
					'target' : '_blank',
					'title' : '새 창 열림'
				});
			} else {
				$(this).find('.file a').on('click', function(){return false;});
			}
		});
	});
};
