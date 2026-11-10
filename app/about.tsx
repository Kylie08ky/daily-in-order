import {t as ui,tr,locale} from '../lib/i18n';
import {useState} from 'react';
import './about.css';
import BrandMark from './brand-mark';
declare const __APP_VERSION__:string;
type Update={date:string;title:string;items:string[]};
const recent:Update[]=[
 {date:'2026-11-10',title:'当日事项，轻松操作',items:['左滑完成、右滑到次日，点击编辑，拖动手柄排序；历史投入保持原日期。']},
 {date:'2026-11-10',title:'三类任务，按需安排',items:['长期与阶段性常驻按需生成独立执行记录，支持暂停、归档和同日防重复。']},
 {date:'2026-11-09',title:'一个任务，多天推进',items:['同一任务支持跨天、跨周分段安排，专注与补记仍汇总到原任务。']},
 {date:'2026-11-08',title:'学习模块与独立进度',items:['学习子项按模块汇总实际时长，可设置模块周目标，分别查看周期时长和累计数量。']},
 {date:'2026-11-08',title:'阅读记录改为当前页码',items:['完成每日阅读任务时可填写读到第几页，书房与首页同步更新；原有增量记录保留。']},
 {date:'2026-11-07',title:'从月度目标到每周安排',items:['选择本月项目与投入时长，按当月天数分到各周，再安排任务；实际投入自动汇总。']},
 {date:'2026-11-07',title:'项目进度由你选择',items:['按投入时长或任务完成度查看进度，项目总览与模块同步切换。']},
 {date:'2026-11-06',title:'项目模块可展开和收起',items:['收起时保留完成数量和进度条，可逐个或全部展开，添加事项时自动展开对应模块。']},
 {date:'2026-11-06',title:'语言切换移到设置',items:['在设置页直接切换中文、英语与德语，顶部不再占用一行。']},
 {date:'2026-11-06',title:'侧栏不再被语言栏挤出屏幕',items:['按语言栏实际高度调整侧栏，目录单独滚动，底部入口保持可见。','设置、头像和个人名称合成一个入口，电脑与手机都能直接打开。']},
 {date:'2026-11-06',title:'通过对话，开始自己的工作台',items:['AI 入门与操作引导连通，可一次确认创建项目、任务和日程，支持继续对话修改。','老用户可在设置 → 使用指南重新打开；同名项目复用，已有记录保留。']},
 {date:'2026-11-06',title:'AI 助手，从第一次使用开始',items:['新用户直接看到 AI 入门，可用一句话整理安排，也可以自己写清单或跳过。','侧栏和今日概览新增独立 AI 助手入口，日后随时继续整理。']},
 {date:'2026-11-04',title:'快速开始与 AI 草稿',items:['先写清单再开始，支持批量预览、编辑与撤销；项目和目标可以以后设置。','可选云端 AI 整理，先确认发送文字，再检查草稿；没有填写的实际投入不会自动补写。']},
 {date:'2026-11-04',title:'新增德语界面',items:['登录页和工作台顶部可切换中文、English 与 Deutsch，当前设备会记住选择。','德语覆盖日程、项目、生活模块、财务、引导和提示；日期与金额采用德语格式，用户记录保持原文。']},
 {date:'2026-11-04',title:'中英文，随时切换',items:['登录页和工作台顶部可切换中文与 English，界面语言会在当前设备记住。','日程、项目、学习、阅读、作息、运动、财务、设置与引导支持英文。','切换语言保留当前账号和记录，用户填写的名称、任务与笔记保持原文；预览与正式数据继续隔离。']},
 {date:'2026-11-04',title:"按需开启模块，记录每日摄入",items:['首次引导先选择需要的学习、阅读、作息、运动和财务模块，未选的隐藏，设置中随时调整。','运动新增可选的每日摄入：个人热量与蛋白质参考目标，每餐记录、编辑、删除与恢复。','运动消耗单独记录，饮食目标不自动增加；个人资料和记录继续按账号及预览/正式空间隔离。']},
 {date:'2026-11-04',title:"当日事项，更轻松地看与做",items:['时间轴与列表共用等高区域，事项在框内滚动；项目与随记上下对齐，随记留出更大书写空间。','不填时间的事项留在列表；相接时段同列显示，仅真正重叠时并排。','列表使用带悬停说明的小图标；事项详情简化，补记只填用时也能保存。','专注保留真实起止；缺少起止的旧投入不再套用原计划位置。']},
 {date:'2026-11-04',title:"一条时间轴，随时修正投入",items:['安排与真实投入显示在同一条时间轴；拖动时间条即可调整位置，分段投入各有自己的时间。','每条投入支持修改、删除和恢复，累计时长、自动进度与复盘同步更新。','从时间轴点击已投入事项，直接编辑对应记录；手动完成百分比保持由你掌握。']},
 {date:'2026-11-04',title:"一项任务，可以分几次完成",items:['专注结束自动记录真实起止，暂停期间不计入；每段投入保留真实时间。','任务旁新增「记进展」，每次时长累加，可补记起止时间或手动填写完成百分比。','时长进度同步更新项目，分段投入按实际日期进入复盘；编辑计划的高级选项默认收起。']},
 {date:'2026-11-04',title:"预览测试，独立保存",items:['预览版与正式版使用各自的数据空间，任务、目标、专注记录与反馈互不同步。','原账号可继续登录；确认后发布功能，只更新程序，不搬运测试数据。']},
 {date:'2026-11-04',title:"从今日安排，直接进入专注",items:['首页改为紧凑的时间轴、项目进度与生活概览，待重新安排的任务集中到任务池。','任务旁可直接开始正向或倒计时，全屏展示计时与实时成长值；倒计时到点停止。','学习支持累计、周、月、年投入长条；已记录的未完成任务也计入实际投入。','设置中可选择展示的生活模块，关闭不删除历史记录。']},
 {date:'2026-11-04',title:"更清楚的账号区域，新的日常有序视觉",items:['同步状态收进顶部状态条，账号详情按同步备份、设备说明与存储管理分区。','品牌标记、绿色导航和更新记录采用新的视觉样式；保留熟悉的日程操作和摄影背景。']},
 {date:'2026-11-04',title:"应用版本与更新记录",items:['设置中新增「关于」，可以查看当前使用的版本和最近的改动。','较早更新可展开查看；使用指南与问题反馈也能从这里进入。']},
 {date:'2026-11-04',title:"设置更清楚，查找更轻松",items:['设置按日历与偏好、生活目标、专注计时、使用指南、问题反馈和回收站分区。','学习、阅读、作息、运动目标独立排列，时长支持小时与分钟输入。','手机端分类栏可横向滑动，表单自动纵向排列。']},
 {date:'2026-11-03',title:"反馈入口与更清晰的界面",items:['可以填写问题和建议，附上截图，并在「我的反馈」查看回复。','操作引导增加反馈介绍，从创建项目到安排任务都有逐步提示。','提高深色卡片与浅底按钮的文字对比度，简化时间安全线展示。']}
];
const earlier:Update[]=[
 {date:'2026-11-03',title:"从设定目标到安排第一项任务",items:['首次使用可以逐步设置学习、阅读、作息和运动目标，也可以跳过。','操作引导支持创建项目、添加任务、安排到时间轴以及完成与复盘；已有账号可重新打开。']},
 {date:'2026-11-03',title:"适合每个人的生活工作台",items:['学习方向、生活目标与默认时长可按自己的需要设置。','财务支持自定义账户和预算，不同币种分别统计。']}
];
function UpdateEntry({entry,current=false}:{entry:Update;current?:boolean}){return <article className="about-update"><header><time dateTime={entry.date}>{entry.date}</time><h4>{ui(entry.title)}</h4>{current&&<span className="about-current">{ui("当前版本")}</span>}</header><ul>{entry.items.map(item=><li key={item}>{ui(item)}</li>)}</ul></article>;}
export default function AboutPage({setTab}:{setTab:(tab:string)=>void}){
 const [showData,setShowData]=useState(false);
 return <section className="settings-card about-page" aria-label={ui("关于日常有序")}><div className="about-brand"><div className="about-identity"><BrandMark className="about-mark"/><div><h3>{ui("日常有序")}</h3><p>Daily in Order</p></div></div><span className="about-version">{ui("版本 v")}{__APP_VERSION__}</span></div><p className="about-motto">{ui("让每一天，都有自己的节奏。")}</p><p className="about-english">A little progress, every day.</p><p className="about-description">{ui("把想做的事安排进日常，记录投入，看到项目与生活的进展。")}</p><div className="about-actions"><button aria-expanded={showData} aria-controls="about-data" onClick={()=>setShowData(!showData)}>{ui("数据与隐私说明")}</button><button onClick={()=>setTab('使用指南')}>{ui("使用指南")}</button><button onClick={()=>setTab('问题反馈')}>{ui("问题反馈")}</button></div>{showData&&<div className="about-data" id="about-data"><h4>{ui("你的记录如何保存")}</h4><p>{ui("AI 整理仅在你同意后发送本次对话与选中的项目和任务草稿给 Google AI，不会自动发送已有任务、笔记或财务记录。普通清单解析在本机完成。")}</p><p>{ui("账号登录由 Firebase Authentication 提供，工作台记录保存在当前账号的云端空间，并在当前浏览器保留离线副本。不同账号的工作台记录相互隔离。")}</p><p>{ui("已登录并加载的数据可离线继续记录，联网后同步。首次登录、反馈发送和读取回复需要联网。重要记录可在「数据与导出」自行备份。")}</p><p>{ui("提交反馈时会发送所填文字、所选截图、联系方式（如填写）、账号标识和提交时间。反馈仅提交者和指定反馈管理员可见，不会附带工作台记录。")}</p><p>{ui("预览版与正式版可用同一账号登录，但工作台记录、离线队列和反馈分别保存。发布功能只更新程序，不复制测试数据。")}</p></div>}<div className="about-updates"><h3>{ui("版本足迹")}</h3>{recent.map((entry,i)=><UpdateEntry key={entry.title} entry={entry} current={i===0}/>)}</div><details className="about-earlier"><summary>{ui("更早的更新（")}{earlier.length}）</summary>{earlier.map(entry=><UpdateEntry key={entry.title} entry={entry}/>)}</details></section>;
}
