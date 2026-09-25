import type { ActivityStage, ActivityType } from '../../models/Activity'

type A = { order:number; stage:ActivityStage; core:boolean; type:ActivityType; title:string; prompt:string; target:string; choices?:string[]; answer?:string; hint?:string; difficulty:'easy'|'medium'|'hard'; xp:number; estimatedSeconds:number; voiceEnabled:boolean; aiEnabled:boolean; metadata?:Record<string,unknown>; content?:Record<string,unknown> }
const base = { core:true, difficulty:'easy' as const, estimatedSeconds:75 }
const choice = (order:number, stage:ActivityStage, title:string, prompt:string, choices:string[], answer:string, digitalType:string):A => ({...base,order,stage,type:'PICTURE_CHOICE',title,prompt,target:answer,choices,answer,xp:15,voiceEnabled:true,aiEnabled:false,metadata:{digitalType,optionMode:true,micMode:true,allowMic:true,expectedPhrase:answer,conversationMode:'CONTROLLED',followUpEnabled:false,ttsText:prompt}})
const speak = (order:number, stage:ActivityStage, title:string, prompt:string, target:string, digitalType:string):A => ({...base,order,stage,type:stage==='INTERACT'||stage==='FINAL_TALK'?'CONVERSATION':'SPEAKING',title,prompt,target,xp:20,voiceEnabled:true,aiEnabled:true,metadata:{digitalType,micMode:true,allowMic:true,expectedPhrase:target,conversationMode:stage==='INTERACT'||stage==='FINAL_TALK'?'OPEN':'CONTROLLED',followUpEnabled:stage==='INTERACT'||stage==='FINAL_TALK',ttsText:prompt}})

export const unit2PartnerActivities:A[] = [
  choice(1,'WARM_UP','Find out about a friend','Which question helps you learn a partner’s name?',['What is your name?','What is on the menu?','What day is tomorrow?'],'What is your name?','INTERVIEW'),
  speak(2,'LISTEN_REPEAT','Interview model','Listen and repeat the interview question.','What do you like to do after school?','LISTEN_REPEAT'),
  choice(3,'SPEAK','Choose a follow-up','Your partner likes drawing. What can you ask next?',['What do you like to draw?','What would you like to order?','When do you wake up?'],'What do you like to draw?','FOLLOW_UP_QUESTION'),
  speak(4,'INTERACT','Partner interview','Ask for your partner’s age, favourite food and hobby.','What is your name and age? What is your favourite food and hobby?','INTERVIEW'),
  choice(5,'PRACTICE_ZONE','Build the partner poster','Choose the best poster sentence.',['This is Riya. She likes idli and drawing.','Riya menu idli.','Yesterday is Riya.'],'This is Riya. She likes idli and drawing.','MODEL_DIALOGUE'),
  speak(6,'INTERACT','Tell Miss Julie','Tell Miss Julie what you learned about your partner.','My partner likes drawing after school.','MIC_RESPONSE'),
  choice(7,'PRESENT','Presentation posture','What helps an audience understand you?',['Stand straight and speak clearly.','Turn away and whisper.','Read every word very quickly.'],'Stand straight and speak clearly.','SELF_REFLECTION'),
  speak(8,'PRESENT','Use your poster','Present without reading every word.','This is my partner. Her favourite food is idli and her hobby is drawing.','PRESENTATION'),
  speak(9,'FINAL_CHALLENGE','Partner Presenter challenge','Give a clear partner presentation with a beginning, details and ending.','Hello. This is my partner Riya. She likes idli and drawing. Thank you.','FINAL_CHALLENGE'),
  speak(10,'FINAL_TALK','Present to Miss Julie','Give your final partner presentation to Miss Julie.','Let me tell you all about my partner.','BADGE_REWARD'),
]

export const unit3OrderActivities:A[] = [
  choice(1,'WARM_UP','Taste and texture','Which word describes a crispy dosa?',['crispy','sleepy','late'],'crispy','IMAGE_CHOICE'),
  speak(2,'LISTEN_REPEAT','Polite order model','Listen and repeat.','I would like a dosa, please.','LISTEN_REPEAT'),
  choice(3,'SPEAK','Choose your order','What would you like to order?',['I would like a dosa, please.','Give dosa.','Yesterday dosa.'],'I would like a dosa, please.','MIC_RESPONSE'),
  speak(4,'INTERACT','Talkora Café waiter','Order one food and one drink from Miss Julie.','I would like idli and a glass of water, please.','ROLEPLAY'),
  choice(5,'PRACTICE_ZONE','Confirm the order','The waiter repeats your order correctly. What do you say?',['Yes, thank you.','No calendar.','I wake up.'],'Yes, thank you.','MULTIPLE_CHOICE'),
  choice(6,'PRACTICE_ZONE','Ask for repetition','You did not hear the waiter. What can you say?',['Can you please repeat that?','No, thank you.','It is crispy.'],'Can you please repeat that?','MODEL_DIALOGUE'),
  speak(7,'INTERACT','Food feedback','Tell the waiter how your food tastes.','The dosa is crispy and delicious. Thank you.','MIC_RESPONSE'),
  choice(8,'PRACTICE_ZONE','Polite refusal','The waiter offers another drink. You do not want it.',['No, thank you.','Go away.','I yesterday.'],'No, thank you.','MULTIPLE_CHOICE'),
  speak(9,'FINAL_CHALLENGE','Menu Master roleplay','Complete an order, confirmation and polite thank-you.','I would like chole bhature, please. Yes, that is my order. Thank you.','FINAL_CHALLENGE'),
  speak(10,'FINAL_TALK','Final café talk','Have a complete restaurant conversation with Miss Julie.','Good afternoon. May I see the menu, please?','BADGE_REWARD'),
]

export const unit4CalendarActivities:A[] = [
  choice(1,'WARM_UP','Past, routine or future','Which word tells us about the past?',['yesterday','every day','tomorrow'],'yesterday','ORDERING'),
  speak(2,'LISTEN_REPEAT','Yesterday model','Listen and repeat.','Yesterday I went to the park with my sister. I felt happy.','LISTEN_REPEAT'),
  speak(3,'SPEAK','Talk about the past','Say where you went, who went with you and how you felt.','Yesterday I went to the market with my mother. I felt excited.','MIC_RESPONSE'),
  choice(4,'PRACTICE_ZONE','Order the morning routine','What happens first?',['I wake up at seven.','I go to school.','I go to bed.'],'I wake up at seven.','ORDERING'),
  speak(5,'INTERACT','Daily routine interview','Answer Miss Julie’s routine questions.','I wake up at seven and eat idli for breakfast.','INTERVIEW'),
  choice(6,'PRACTICE_ZONE','Travel to school','Complete the sentence: I go to school ___.',['by bus','tomorrow','happy'],'by bus','FILL_BLANK'),
  speak(7,'SPEAK','After school','Tell what you do after school and when you go to bed.','After school I play outside. I go to bed at nine.','MIC_RESPONSE'),
  speak(8,'LISTEN_REPEAT','Future model','Listen and repeat.','Tomorrow I will visit my grandmother with my family.','LISTEN_REPEAT'),
  speak(9,'INTERACT','Future plans','Say where and when you will go, who will join you and how you feel.','Next week I will visit Pune with my family. I feel excited.','FOLLOW_UP_QUESTION'),
  speak(10,'FINAL_CHALLENGE','Calendar challenge','Combine yesterday, your daily routine and tomorrow.','Yesterday I played cricket. Every day I go to school. Tomorrow I will visit my cousin.','FINAL_CHALLENGE'),
  speak(11,'FINAL_TALK','Final calendar talk','Have a complete past, routine and future conversation with Miss Julie.','Let me tell you about yesterday, every day and tomorrow.','BADGE_REWARD'),
]
