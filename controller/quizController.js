const Quiz = require("../model/quizSchema");
const Assessment = require("../model/assessmentSchema");
const mongoose = require('mongoose')

const createQuiz = async (req, res) => {
  try {  
    const { quizName, quizType, quizQuestions } = req.body
    if (!quizName || !quizType || !quizQuestions) {
      return res.status(400).json({
        success: false,
        message: "Quiz details are not correct!"
      });
    }
    const quiz = { ...req.body, userId: req.user._id };
    const newQuiz = new Quiz(quiz);
    const quizDetails = await newQuiz.save();
    res.status(201).json({
      success: true,
      quiz: quizDetails,     
      messages: "New quiz created!"
    })
  } catch (error) {    
    res.status(400).json({
      success: false,
      message: error.message
    })
  }
}

const getAllQuiz = async (req, res) => {
  try {
    const allQuiz = await Quiz.find();
    if (!allQuiz)
      return res.status(400).json({
        success: false,
        message: "Quizzes are not present!"
      });
    res.status(201).json({
      success: true,
      allQuiz: allQuiz,
      messages: "Get all quizzes!"
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    })
  }
}
const getQuizById = async (req, res) => {
  try {
    const quizId = req.params.quizId;
    const quiz = await Quiz.findByIdAndUpdate(
      quizId,
      { $inc: { impression: 1 } },
      { new: true }
    ).exec();

    if (!quiz) {
      return res.status(400).json({
        success: false,
        messages: "Quiz not found!"
      })
    }
    res.status(201).json({
      success: true,
      quiz: quiz,
      messages: "Get your quiz!"
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    })
  }
}

const getQuizByUserId = async (req, res) => {
  try {

    const quizzes = await Quiz.find({ userId: new mongoose.Types.ObjectId(req.params.userId + "") }).sort({ createdAt: -1 });
    if (!quizzes)
      return res.status(400).json({
        success: false,
        message: "Quizzes not found!"
      });
    res.status(201).json({
      success: true,
      quizzes: quizzes,
      messages: "Get your quizzes!"
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    })
  }
}

const getTrendingQuiz = async (req, res) => {
  try {
    const quizzes = await Quiz.find({ userId: req.user._id, impression: { $gt: 10 } });
    if (!quizzes)
      return res.status(400).json({
        success: false,
        message: "Trending quizzes are not found!"
      });
    res.status(201).json({
      success: true,
      quizzes: quizzes,
      messages: "Get trending quizzes!"
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    })
  }
}

const getQuizDetails = async (req, res) => {
  try {
    const quizDetails = await Quiz.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user._id), impression: { $gt: 10 } } },
      {
        $group: {
          _id: 1,
          totalQuizzes: { $sum: 1 },
          totalImpressions: { $sum: "$impression" },
          totalQuestions: { $sum: { $size: "$quizQuestions" } }
        }
      }
    ]);
    if (!quizDetails)
      return res.status(400).json({
        success: false,
        message: "Quiz details are not found!"
      });
    res.status(201).json({
      success: true,
      quizDetails: quizDetails,
      messages: "Get quiz details!"
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    })
  }
}

const deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndDelete({ _id: req.params.quizId });
    if (!quiz)
      return res.status(400).json({
        success: false,
        message: "Something went wrong!"
      });
    res.status(201).json({
      success: true,
      quiz: quiz,
      messages: "quiz is successfully deleted!"
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    })
  }
}

const assessment = async (req, res) => {
  try {
    const { quizId, quizType, assessment } = req.body;   
    if (quizType === "Q&A") {
      console.log("===========================177")
      for (let question of assessment) {
        const { _id, isCorrect } = question;

        let update = {
          $inc: {
            attemptedPeople: 1,
            correctAnswered: isCorrect ? 1 : 0,
            incorrectAnswered: !isCorrect ? 1 : 0
          }
        };

        let options = {
          upsert: true,
          new: true
        };

        await Assessment.findOneAndUpdate(
          { quizId, questionId: _id, quizType },
          update,
          options
        );
      }
    }

    if (quizType === "Poll_Type") {
      for (let question of assessment) {
        const { _id, option } = question;
        let update = {
          $inc: {
            option1: option && option === 1 ? 1 : 0,
            option2: option && option === 2 ? 1 : 0,
            option3: option && option === 3 ? 1 : 0,
            option4: option && option === 4 ? 1 : 0,
          }
        };

        let options = {
          upsert: true,
          new: true
        };

        await Assessment.findOneAndUpdate(
          { quizId, questionId: _id, quizType },
          update,
          options
        );
      }
    }
    res.status(201).json({
      success: true,
      messages: "Assessment updated successfully!"
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    })
  }
}

const getAssessmentData = async (req, res) => {
  try {
    const { quizType, quizId } = req.body;  
    let fieldsToSelect;
    if (quizType === 'Q&A') {
      fieldsToSelect = 'questionId quizType attemptedPeople correctAnswered incorrectAnswered';
    } else if (quizType === 'Poll_Type') {
      fieldsToSelect = 'questionId quizType option1 option2 option3 option4';
    } else {
      throw new Error('Invalid quiz type');
    }

    if(!quizType || !quizId){
      return res.status(400).json({
        success: false,
        message: "Something went wrong!"
      });
    }
    const assessmentData=await Assessment.find({
        quizId:new mongoose.Types.ObjectId(quizId), 
        quizType:quizType}
      ).select(fieldsToSelect);

      res.status(201).json({
        success: true,
        assessmentData:assessmentData,
        messages: "Get assessment details!"
      })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    })
  }
}

const updateQuiz=async(req,res)=>{
  try{
    const {quizId} = req.params;    
    console.log(quizId)
    console.log(req.body)    
    const updatedQuiz = await Quiz.findOneAndUpdate({_id:new mongoose.Types.ObjectId(quizId)},{...req.body});
    if (!updatedQuiz)
      return res.status(400).json({
        success: false,
        message: "Something went wrong!"
      });
    res.status(201).json({
      success: true,
      updatedQuiz: updatedQuiz,
      messages: "Quiz is updated successfully!"
    })
  }catch(error){
    res.status(400).json({
      success: false,
      message: error.message
    })
  }
}

module.exports = {
  createQuiz,
  getAllQuiz,
  getQuizById,
  getQuizByUserId,
  getTrendingQuiz,
  deleteQuiz,
  getQuizDetails,
  assessment,
  getAssessmentData,
  updateQuiz
};